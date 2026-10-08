import asyncio
import importlib.util
import sys
import types
import unittest
from pathlib import Path


sys.modules.setdefault("websockets", types.ModuleType("websockets"))

MODULE_PATH = Path(__file__).with_name("so101-bridge.py")
MODULE_SPEC = importlib.util.spec_from_file_location("so101_bridge", MODULE_PATH)
if MODULE_SPEC is None or MODULE_SPEC.loader is None:
    raise RuntimeError("could not load bridge module")
bridge_module = importlib.util.module_from_spec(MODULE_SPEC)
sys.modules[MODULE_SPEC.name] = bridge_module
MODULE_SPEC.loader.exec_module(bridge_module)


class So101BridgeTest(unittest.IsolatedAsyncioTestCase):
    def setUp(self) -> None:
        self.bridge = bridge_module.So101Bridge("dry-run", "test", live=False)

    async def asyncSetUp(self) -> None:
        await self.bridge.connect()

    async def test_target_outside_active_caps_is_rejected(self) -> None:
        caps = {joint: [-180.0, 180.0] for joint in bridge_module.JOINTS}
        caps["shoulder_pan"] = [-10.0, 10.0]
        self.bridge.set_caps(caps)
        self.bridge.state.enabled = True
        target = {joint: 0.0 for joint in bridge_module.JOINTS}
        target["shoulder_pan"] = 11.0

        with self.assertRaisesRegex(ValueError, "shoulder_pan is outside its active caps"):
            await self.bridge.set_target(target)

    async def test_tightening_caps_clamps_stored_position(self) -> None:
        self.bridge.state.positions["shoulder_pan"] = 8.0
        caps = {joint: [-180.0, 180.0] for joint in bridge_module.JOINTS}
        caps["shoulder_pan"] = [-5.0, 5.0]

        self.bridge.set_caps(caps)

        self.assertEqual(self.bridge.state.positions["shoulder_pan"], 5.0)

    async def test_refresh_is_safe_only_while_disabled(self) -> None:
        self.bridge.state.enabled = True
        with self.assertRaisesRegex(ValueError, "disable control before refreshing position"):
            await self.bridge.refresh_position()
        self.bridge.state.enabled = False
        await self.bridge.refresh_position()
        self.assertEqual(self.bridge.state.positions["shoulder_pan"], 0.0)

    async def test_refresh_preserves_observation_outside_active_caps(self) -> None:
        class Robot:
            def get_observation(self) -> dict[str, float]:
                return {f"{joint}.pos": 20.0 if joint == "shoulder_pan" else 0.0 for joint in bridge_module.JOINTS}

        self.bridge.live = True
        self.bridge.robot = Robot()
        self.bridge.limits["shoulder_pan"] = (-10.0, 10.0)
        await self.bridge.refresh_position()

        self.assertEqual(self.bridge.state.positions["shoulder_pan"], 20.0)

    async def test_enable_rejects_observation_outside_active_caps(self) -> None:
        self.bridge.state.positions["shoulder_pan"] = 20.0
        self.bridge.limits["shoulder_pan"] = (-10.0, 10.0)

        with self.assertRaisesRegex(ValueError, "shoulder_pan is outside its active caps"):
            await self.bridge.enable_control()

        self.assertFalse(self.bridge.state.enabled)

    async def test_enable_uses_reviewed_target(self) -> None:
        target = {joint: 1.0 for joint in bridge_module.JOINTS}

        await self.bridge.enable_control(target)

        self.assertTrue(self.bridge.state.enabled)
        self.assertEqual(self.bridge.state.positions, target)

    async def test_live_enable_sends_reviewed_target_before_enabling(self) -> None:
        class Robot:
            def __init__(self) -> None:
                self.actions: list[dict[str, float]] = []

            def send_action(self, action: dict[str, float]) -> None:
                self.actions.append(action)

        robot = Robot()
        self.bridge.live = True
        self.bridge.robot = robot
        target = {joint: 2.0 for joint in bridge_module.JOINTS}

        await self.bridge.enable_control(target)

        self.assertEqual(robot.actions, [{f"{joint}.pos": 2.0 for joint in bridge_module.JOINTS}])
        self.assertTrue(self.bridge.state.enabled)
        self.assertEqual(self.bridge.state.positions, target)

    async def test_live_enable_failure_does_not_enable(self) -> None:
        class Robot:
            def send_action(self, action: dict[str, float]) -> None:
                raise RuntimeError("send failed")

        self.bridge.live = True
        self.bridge.robot = Robot()
        target = {joint: 2.0 for joint in bridge_module.JOINTS}

        with self.assertRaisesRegex(RuntimeError, "send failed"):
            await self.bridge.enable_control(target)

        self.assertFalse(self.bridge.state.enabled)
        self.assertEqual(self.bridge.state.positions, {joint: 0.0 for joint in bridge_module.JOINTS})


if __name__ == "__main__":
    unittest.main()
