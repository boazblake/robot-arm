package io.boazblake.liftmate;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;

import io.boazblake.liftmate.capacitormediapipe.CapacitorMediaPipePlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Initializes the Bridge
        this.init(savedInstanceState, new ArrayList<Class<? extends Plugin>>() {{
            add(CapacitorMediaPipePlugin.class);
        }});
    }
}
