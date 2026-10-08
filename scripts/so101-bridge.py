#!/usr/bin/env python3
"""Local, explicit-enable SO-101 joint bridge for the robot-arm web app."""

from __future__ import annotations

import argparse
import asyncio
import json
import time
from dataclasses import dataclass
from typing import Any

import websockets

JOINTS = (
    "shoulder_pan",
    "shoulder_lift",
    "elbow_flex",
    "wrist_flex",
    "wrist_roll",
    "gripper",
)
STALE_AFTER_SECONDS = 0.5


def log_event(event: str, **fields: object) -> None:
    print(json.dumps({"component": "so101-bridge", "event": event, "time": time.time(), **fields}), flush=True)


@dataclass
class BridgeState:
    connected: bool = False
    enabled: bool = False
    last_command_at: float = 0.0
    positions: dict[str, float] | None = None


class So101Bridge:
    def __init__(self, port: str, robot_id: str, live: bool) -> None:
        self.port = port
        self.robot_id = robot_id
        self.live = live
        self.state = BridgeState(positions={joint: 0.0 for joint in JOINTS})
        self.robot: Any = None
        self.calibration_limits: dict[str, tuple[float, float]] = {
            joint: (-180.0, 180.0) for joint in JOINTS
        }
        self.limits = dict(self.calibration_limits)

    async def connect(self) -> None:
        log_event("connect-requested", live=self.live, port=self.port, robot_id=self.robot_id)
        if self.state.connected:
            log_event("connect-already-active")
            return
        if self.live:
            from lerobot.robots.so_follower import SO101Follower, SO101FollowerConfig

            config = SO101FollowerConfig(port=self.port, id=self.robot_id)
            self.robot = SO101Follower(config)
            await asyncio.to_thread(self.robot.connect, calibrate=False)
            self._read_calibration_limits()
            observation = await asyncio.to_thread(self.robot.get_observation)
            observed = {joint: float(observation[f"{joint}.pos"]) for joint in JOINTS}
            self.state.positions = self._clamp_positions(observed)
            if self.state.positions != observed:
                log_event("observation-clamped", observed=observed, clamped=self.state.positions)
        self.limits = dict(self.calibration_limits)
        self.state.connected = True
        self.state.enabled = False
        self.state.last_command_at = time.monotonic()
        log_event("connected", live=self.live, limits=self.limits, positions=self.state.positions)

    async def disconnect(self) -> None:
        log_event("disconnect-requested", connected=self.state.connected, enabled=self.state.enabled)
        self.state.enabled = False
        self.state.connected = False
        if self.robot is not None:
            await asyncio.to_thread(self.robot.disconnect)
            self.robot = None
        log_event("disconnected")

    def _read_calibration_limits(self) -> None:
        calibration = getattr(self.robot, "calibration", {})
        bus = self.robot.bus
        for joint in JOINTS:
            item = calibration.get(joint)
            motor = bus.motors[joint]
            if item is None:
                continue
            if motor.norm_mode.value == "range_0_100":
                self.calibration_limits[joint] = (0.0, 100.0)
                continue
            midpoint = (float(item.range_min) + float(item.range_max)) / 2
            resolution = float(bus.model_resolution_table[motor.model] - 1)
            self.calibration_limits[joint] = (
                (float(item.range_min) - midpoint) * 360.0 / resolution,
                (float(item.range_max) - midpoint) * 360.0 / resolution,
            )

    def _clamp_positions(self, positions: dict[str, float]) -> dict[str, float]:
        return {
            joint: min(high, max(low, positions[joint]))
            for joint, (low, high) in self.limits.items()
        }

    def _validate_positions(self, value: Any) -> dict[str, float]:
        if not isinstance(value, dict) or set(value) != set(JOINTS):
            raise ValueError("target must contain exactly all six SO-101 joints")
        positions: dict[str, float] = {}
        for joint in JOINTS:
            position = value[joint]
            if not isinstance(position, (int, float)) or isinstance(position, bool):
                raise ValueError(f"{joint} must be numeric")
            low, high = self.limits[joint]
            if not low <= float(position) <= high:
                raise ValueError(f"{joint} is outside its active caps")
            positions[joint] = float(position)
        return positions

    def set_caps(self, value: Any) -> None:
        if self.state.enabled:
            raise ValueError("disable control before changing caps")
        if not isinstance(value, dict) or set(value) != set(JOINTS):
            raise ValueError("caps must contain exactly all six SO-101 joints")
        next_limits: dict[str, tuple[float, float]] = {}
        for joint in JOINTS:
            bounds = value[joint]
            if not isinstance(bounds, list) or len(bounds) != 2:
                raise ValueError(f"{joint} caps must be [min, max]")
            low, high = float(bounds[0]), float(bounds[1])
            calibration_low, calibration_high = self.calibration_limits[joint]
            if not calibration_low <= low < high <= calibration_high:
                raise ValueError(f"{joint} caps exceed calibration limits or are empty")
            next_limits[joint] = (low, high)
        self.limits = next_limits
        self.state.positions = self._clamp_positions(self.state.positions or {})
        log_event("caps-updated", limits=self.limits)

    async def refresh_position(self) -> None:
        if not self.state.connected:
            raise ValueError("bridge is disconnected")
        if self.state.enabled:
            raise ValueError("disable control before refreshing position")
        if self.live:
            observation = await asyncio.to_thread(self.robot.get_observation)
            observed = {joint: float(observation[f"{joint}.pos"]) for joint in JOINTS}
            self.state.positions = observed
        log_event("position-refreshed", positions=self.state.positions, live=self.live)

    async def set_target(self, value: Any) -> None:
        if not self.state.connected:
            log_event("target-rejected", reason="disconnected")
            raise ValueError("bridge is disconnected")
        if not self.state.enabled:
            log_event("target-rejected", reason="control-disabled")
            raise ValueError("control is disabled")
        positions = self._validate_positions(value)
        log_event("target-accepted", positions=positions, live=self.live)
        if self.live:
            action = {f"{joint}.pos": position for joint, position in positions.items()}
            await asyncio.to_thread(self.robot.send_action, action)
        self.state.positions = positions
        self.state.last_command_at = time.monotonic()

    def enable_control(self, value: Any = None) -> None:
        if not self.state.connected:
            raise ValueError("connect before enabling control")
        positions = self._validate_positions(self.state.positions if value is None else value)
        self.state.positions = positions
        self.state.enabled = True
        self.state.last_command_at = time.monotonic()

    async def stop(self) -> None:
        self.state.enabled = False
        await self.disconnect()

    async def watchdog(self) -> None:
        while True:
            await asyncio.sleep(0.1)
            if (
                self.state.connected
                and self.state.enabled
                and time.monotonic() - self.state.last_command_at > STALE_AFTER_SECONDS
            ):
                log_event("stale-timeout", age_seconds=time.monotonic() - self.state.last_command_at)
                await self.stop()

    def snapshot(self) -> dict[str, Any]:
        return {
            "type": "state",
            "connected": self.state.connected,
            "enabled": self.state.enabled,
            "live": self.live,
            "joints": list(JOINTS),
            "limits": {joint: list(bounds) for joint, bounds in self.limits.items()},
            "calibration_limits": {joint: list(bounds) for joint, bounds in self.calibration_limits.items()},
            "positions": self.state.positions,
        }


async def serve_client(bridge: So101Bridge, websocket: Any) -> None:
    log_event("client-connected")
    await websocket.send(json.dumps(bridge.snapshot()))
    async for raw in websocket:
        message: Any = None
        try:
            message = json.loads(raw)
            kind = message.get("type")
            if kind == "connect":
                await bridge.connect()
            elif kind == "disconnect":
                await bridge.disconnect()
            elif kind == "enable":
                bridge.enable_control(message.get("positions"))
            elif kind == "disable":
                bridge.state.enabled = False
            elif kind == "set-target":
                await bridge.set_target(message.get("positions"))
            elif kind == "refresh":
                await bridge.refresh_position()
            elif kind == "set-caps":
                bridge.set_caps(message.get("caps"))
            elif kind == "stop":
                await bridge.stop()
            else:
                raise ValueError(f"unknown message type: {kind}")
            log_event("message-processed", message_type=kind)
            await websocket.send(json.dumps(bridge.snapshot()))
        except Exception as error:
            log_event("message-failed", message_type=message.get("type") if isinstance(message, dict) else None, error=repr(error))
            await websocket.send(json.dumps({"type": "error", "message": str(error)}))


async def main(args: argparse.Namespace) -> None:
    bridge = So101Bridge(args.port, args.robot_id, args.live)
    watchdog = asyncio.create_task(bridge.watchdog())
    async with websockets.serve(lambda ws: serve_client(bridge, ws), args.host, args.listen):
        log_event("listening", host=args.host, port=args.listen, live=args.live)
        await asyncio.Future()
    watchdog.cancel()


parser = argparse.ArgumentParser()
parser.add_argument("--port", default="/dev/tty.usbmodem5B790163741")
parser.add_argument("--robot-id", default="my_so101_arm")
parser.add_argument("--host", default="127.0.0.1")
parser.add_argument("--listen", type=int, default=8765)
parser.add_argument("--live", action="store_true", help="Allow commands to reach the physical arm")
if __name__ == "__main__":
    asyncio.run(main(parser.parse_args()))
