import Foundation
import Capacitor

@objc(MediaPipePlugin)
public class MediaPipePlugin: CAPPlugin {
    private var implementation: MediaPipeProcessor?

    @objc func start(_ call: CAPPluginCall) {
        do {
            implementation = try MediaPipeProcessor(delegate: self)
            try implementation?.startCamera()
            call.resolve()
        } catch {
            call.reject("Failed to start: \(error.localizedDescription)")
        }
    }

    @objc func stop(_ call: CAPPluginCall) {
        implementation?.stopCamera()
        call.resolve()
    }
}

extension MediaPipePlugin: MediaPipeProcessorDelegate {
    func onResults(type: String, result: [String: Any]) {
        notifyListeners("\(type)Landmarks", data: result)
    }
}
