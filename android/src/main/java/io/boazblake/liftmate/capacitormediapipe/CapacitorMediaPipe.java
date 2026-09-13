package io.boazblake.liftmate.capacitormediapipe;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.util.Base64;
import com.getcapacitor.JSObject;
import com.getcapacitor.PluginCall;
import com.google.mediapipe.framework.image.BitmapImageBuilder;
import com.google.mediapipe.framework.image.MPImage;
import com.google.mediapipe.tasks.core.BaseOptions;
import com.google.mediapipe.tasks.vision.core.RunningMode;
import com.google.mediapipe.tasks.vision.poselandmarker.PoseLandmarker;
import com.google.mediapipe.tasks.vision.poselandmarker.PoseLandmarkerResult;
import java.util.ArrayList;
import java.util.List;
import java.util.function.Consumer;

public class CapacitorMediaPipe {

    private PoseLandmarker poseLandmarker;
    private Consumer<JSObject> resultsHandler;

    public void setResultsHandler(Consumer<JSObject> resultsHandler) {
        this.resultsHandler = resultsHandler;
    }

    public void initialize(Context context, PluginCall call) {
        float minPoseDetectionConfidence = call.getFloat("minPoseDetectionConfidence", 0.5f);
        float minTrackingConfidence = call.getFloat("minTrackingConfidence", 0.5f);
        String modelName = call.getString("model", "pose_landmarker_full.task");

        BaseOptions.Builder baseOptionsBuilder = BaseOptions.builder().setModelAssetPath(modelName);
        PoseLandmarker.PoseLandmarkerOptions.Builder optionsBuilder = PoseLandmarker.PoseLandmarkerOptions
            .builder()
            .setBaseOptions(baseOptionsBuilder.build())
            .setRunningMode(RunningMode.LIVE_STREAM)
            .setMinPoseDetectionConfidence(minPoseDetectionConfidence)
            .setMinTrackingConfidence(minTrackingConfidence)
            .setResultListener(this::onResults)
            .setErrorListener(e -> call.reject(e.getMessage()));

        try {
            poseLandmarker = PoseLandmarker.createFromOptions(context, optionsBuilder.build());
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to initialize MediaPipe PoseLandmarker: " + e.getMessage());
        }
    }

    public void send(Context context, PluginCall call) {
        String imageData = call.getString("image");
        if (imageData == null) {
            call.reject("Image data not provided or invalid.");
            return;
        }

        byte[] decodedString = Base64.decode(imageData, Base64.DEFAULT);
        Bitmap bitmap = BitmapFactory.decodeByteArray(decodedString, 0, decodedString.length);

        MPImage image = new BitmapImageBuilder(bitmap).build();
        long timestamp = System.currentTimeMillis();

        poseLandmarker.detectAsync(image, timestamp);
        call.resolve();
    }

    public void close(PluginCall call) {
        if (poseLandmarker != null) {
            poseLandmarker.close();
        }
        call.resolve();
    }

    private void onResults(PoseLandmarkerResult result, MPImage image) {
        JSObject poseData = new JSObject();
        List<JSObject> poseLandmarks = new ArrayList<>();

        result.landmarks().forEach(normalizedLandmarks -> {
            normalizedLandmarks.forEach(landmark -> {
                JSObject landmarkObject = new JSObject();
                landmarkObject.put("x", landmark.x());
                landmarkObject.put("y", landmark.y());
                landmarkObject.put("z", landmark.z());
                landmarkObject.put("visibility", landmark.visibility());
                poseLandmarks.add(landmarkObject);
            });
        });

        poseData.put("poseLandmarks", poseLandmarks);
        resultsHandler.accept(poseData);
    }
}
