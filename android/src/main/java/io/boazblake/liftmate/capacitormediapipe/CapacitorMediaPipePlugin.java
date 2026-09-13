package io.boazblake.liftmate.capacitormediapipe;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "CapacitorMediaPipe")
public class CapacitorMediaPipePlugin extends Plugin {

    private CapacitorMediaPipe implementation = new CapacitorMediaPipe();

    @Override
    public void load() {
        implementation.setResultsHandler(results -> {
            notifyListeners("holisticResults", results);
        });
    }

    @PluginMethod
    public void initialize(PluginCall call) {
        implementation.initialize(getContext(), call);
    }

    @PluginMethod
    public void send(PluginCall call) {
        implementation.send(getContext(), call);
    }

    @PluginMethod
    public void close(PluginCall call) {
        implementation.close(call);
    }
}
