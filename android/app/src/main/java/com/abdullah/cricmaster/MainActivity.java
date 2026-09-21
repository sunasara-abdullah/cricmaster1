package com.abdullah.cricmaster;

import android.os.Bundle;
import android.os.Handler;
import android.view.Gravity;
import android.view.ViewGroup;
import android.widget.FrameLayout;
import android.widget.ImageView;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        FrameLayout overlay = new FrameLayout(this);
        overlay.setBackgroundColor(android.graphics.Color.rgb(7, 17, 31));

        ImageView splash = new ImageView(this);
        splash.setImageResource(R.drawable.splash);
        splash.setScaleType(ImageView.ScaleType.CENTER_CROP);

        FrameLayout.LayoutParams imageParams = new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        );
        imageParams.gravity = Gravity.CENTER;

        overlay.addView(splash, imageParams);

        addContentView(
                overlay,
                new ViewGroup.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT
                )
        );

        new Handler().postDelayed(() -> {
            overlay.animate()
                    .alpha(0f)
                    .setDuration(500)
                    .withEndAction(() -> {
                        ViewGroup parent = (ViewGroup) overlay.getParent();
                        if (parent != null) {
                            parent.removeView(overlay);
                        }
                    })
                    .start();
        }, 2500);
    }
}