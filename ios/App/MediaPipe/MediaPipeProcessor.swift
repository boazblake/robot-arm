import Foundation
import AVFoundation
import MediaPipeTasksVision
import UIKit

protocol MediaPipeProcessorDelegate: AnyObject {
    func onResults(type: String, result: [String: Any])
}

class MediaPipeProcessor: NSObject {
    private let session = AVCaptureSession()
    private let queue = DispatchQueue(label: "MediaPipeCameraQueue")

    private var poseLandmarker: PoseLandmarker!
    private var faceLandmarker: FaceLandmarker!
    private var handLandmarker: HandLandmarker!

    weak var delegate: MediaPipeProcessorDelegate?

    init(delegate: MediaPipeProcessorDelegate) throws {
        super.init()
        self.delegate = delegate

        try setupDetectors()
    }

    private func setupDetectors() throws {
        let poseOptions = PoseLandmarkerOptions()
        poseOptions.runningMode = .liveStream
        poseLandmarker = try PoseLandmarker(options: poseOptions)
        poseLandmarker.delegate = self

        let faceOptions = FaceLandmarkerOptions()
        faceOptions.runningMode = .liveStream
        faceLandmarker = try FaceLandmarker(options: faceOptions)
        faceLandmarker.delegate = self

        let handOptions = HandLandmarkerOptions()
        handOptions.runningMode = .liveStream
        handLandmarker = try HandLandmarker(options: handOptions)
        handLandmarker.delegate = self
    }

    func startCamera() throws {
        guard let device = AVCaptureDevice.default(for: .video) else {
            throw NSError(domain: "Camera", code: -1, userInfo: [NSLocalizedDescriptionKey: "No camera available"])
        }

        let input = try AVCaptureDeviceInput(device: device)
        session.beginConfiguration()
        session.sessionPreset = .high
        session.addInput(input)

        let output = AVCaptureVideoDataOutput()
        output.setSampleBufferDelegate(self, queue: queue)
        output.alwaysDiscardsLateVideoFrames = true
        session.addOutput(output)
        session.commitConfiguration()

        session.startRunning()
    }

    func stopCamera() {
        session.stopRunning()
    }
}

extension MediaPipeProcessor: AVCaptureVideoDataOutputSampleBufferDelegate {
    func captureOutput(_ output: AVCaptureOutput, didOutput sampleBuffer: CMSampleBuffer, from connection: AVCaptureConnection) {
        let timestamp = Int64(CACurrentMediaTime() * 1000)

        do {
            try poseLandmarker.detectAsync(sampleBuffer, timestampInMilliseconds: timestamp)
            try faceLandmarker.detectAsync(sampleBuffer, timestampInMilliseconds: timestamp)
            try handLandmarker.detectAsync(sampleBuffer, timestampInMilliseconds: timestamp)
        } catch {
            print("Detection failed: \(error.localizedDescription)")
        }
    }
}

extension MediaPipeProcessor: PoseLandmarkerLiveStreamDelegate, FaceLandmarkerLiveStreamDelegate, HandLandmarkerLiveStreamDelegate {
    func poseLandmarker(_ landmarker: PoseLandmarker, didFinishDetection result: PoseLandmarkerResult?, timestampInMilliseconds: Int, error: Error?) {
        if let result = result {
            delegate?.onResults(type: "pose", result: ["landmarks": result.landmarks.map { $0.map { ["x": $0.x, "y": $0.y, "z": $0.z] } }])
        }
    }

    func faceLandmarker(_ landmarker: FaceLandmarker, didFinishDetection result: FaceLandmarkerResult?, timestampInMilliseconds: Int, error: Error?) {
        if let result = result {
            delegate?.onResults(type: "face", result: ["landmarks": result.faceLandmarks.map { $0.map { ["x": $0.x, "y": $0.y, "z": $0.z] } }])
        }
    }

    func handLandmarker(_ landmarker: HandLandmarker, didFinishDetection result: HandLandmarkerResult?, timestampInMilliseconds: Int, error: Error?) {
        if let result = result {
            delegate?.onResults(type: "hand", result: ["landmarks": result.landmarks.map { $0.map { ["x": $0.x, "y": $0.y, "z": $0.z] } }])
        }
    }
}
