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
        splash.setScaleX(1.5f);
        splash.setScaleY(1.5f);
        splash.setBackgroundColor(android.graphics.Color.rgb(7, 17, 31));

        addContentView(
                splash,
                new android.view.ViewGroup.LayoutParams(
                        android.view.ViewGroup.LayoutParams.MATCH_PARENT,
                        android.view.ViewGroup.LayoutParams.MATCH_PARENT
                )
        );

        splash.postDelayed(new Runnable() {
            @Override
            public void run() {
                splash.animate()
                        .alpha(0f)
                        .setDuration(300)
                        .withEndAction(new Runnable() {
                            @Override
                            public void run() {
                                android.view.ViewParent parent = splash.getParent();
                                if (parent instanceof android.view.ViewGroup) {
                                    ((android.view.ViewGroup) parent).removeView(splash);
                                }
                            }
                        })
                        .start();
            }
        }, 2000);
    }
}