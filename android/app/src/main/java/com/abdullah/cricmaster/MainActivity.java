package com.abdullah.cricmaster;

import android.os.Bundle;
import android.view.View;
import android.widget.ImageView;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        ImageView splash = new ImageView(this);
        splash.setImageResource(com.abdullah.cricmaster.R.drawable.splash);
        splash.setScaleType(ImageView.ScaleType.CENTER_CROP);
        splash.setBackgroundColor(android.graphics.Color.rgb(7, 17, 31));

        addContentView(
                splash,
                new android.view.ViewGroup.LayoutParams(
                        android.view.ViewGroup.LayoutParams.MATCH_PARENT,
                        android.view.ViewGroup.LayoutParams.MATCH_PARENT
                )
        );

        splash.postDelayed(() -> {
            splash.animate()
                    .alpha(0f)
                    .setDuration(300)
                    .withEndAction(() -> {
                        ((android.view.ViewGroup) splash.getParent()).removeView(splash);
                    })
                    .start();
        }, 2000);
    }
}