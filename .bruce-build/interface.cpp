#include "core/bus_HAL.h"
#include "core/powerSave.h"
#include "core/utils.h"
#include <Arduino.h>
#include <interface.h>

#if defined(USE_TFT_eSPI_TOUCH)
#define XPT2046_CS TOUCH_CS
#endif

/***************************************************************************************
** Function name: _setup_gpio()
** Location: main.cpp
** Description:   initial setup for the device
***************************************************************************************/
SPIClass touchSPI;
void _setup_gpio() {
#if defined(USE_TFT_eSPI_TOUCH)
    pinMode(XPT2046_CS, OUTPUT);
    digitalWrite(XPT2046_CS, HIGH);
#endif
#ifdef HAS_BTN
    pinMode(BTN_PIN, INPUT_PULLUP);
#endif
}

/***************************************************************************************
** Function name: _post_setup_gpio()
** Location: main.cpp
** Description:   second stage gpio setup to make a few functions work
***************************************************************************************/
void _post_setup_gpio() {
#if defined(USE_TFT_eSPI_TOUCH)
    pinMode(TOUCH_CS, OUTPUT);
    uint16_t calData[5];
    File caldata = LittleFS.open("/calData", "r");

    if (!caldata) {
        tft.setRotation(ROTATION);
        tft.calibrateTouch(calData, TFT_WHITE, TFT_BLACK, 10);

        caldata = LittleFS.open("/calData", "w");
        if (caldata) {
            caldata.printf(
                "%d\n%d\n%d\n%d\n%d\n", calData[0], calData[1], calData[2], calData[3], calData[4]
            );
            caldata.close();
        }
    } else {
        Serial.print("\ntft Calibration data: ");
        for (int i = 0; i < 5; i++) {
            String line = caldata.readStringUntil('\n');
            calData[i] = line.toInt();
            Serial.printf("%d, ", calData[i]);
        }
        Serial.println();
        caldata.close();
    }
    tft.setTouch(calData);
#endif

    // Brightness control must be initialized after tft in this case @Pirata
    pinMode(TFT_BL, OUTPUT);
    ledcAttach(TFT_BL, TFT_BRIGHT_FREQ, TFT_BRIGHT_Bits);
    ledcWrite(TFT_BL, 255);
}

/***************************************************************************************
** Function name: getBattery()
** location: display.cpp
** Description:   Delivers the battery value from 1-100
***************************************************************************************/
int getBattery() { return 0; }

/***************************************************************************************
** Function name: isCharging()
** Description:   Default implementation that returns false
***************************************************************************************/
bool isCharging() { return false; }

/*********************************************************************
** Function: setBrightness
** location: settings.cpp
** set brightness value
**********************************************************************/
void _setBrightness(uint8_t brightval) {
    int dutyCycle;
    if (brightval == 100) dutyCycle = 255;
    else if (brightval == 75) dutyCycle = 130;
    else if (brightval == 50) dutyCycle = 70;
    else if (brightval == 25) dutyCycle = 20;
    else if (brightval == 0) dutyCycle = 0;
    else dutyCycle = ((brightval * 255) / 100);

    ledcWrite(TFT_BL, dutyCycle);
}

/*********************************************************************
** Function: InputHandler
** Handles the variables PrevPress, NextPress, SelPress, AnyKeyPress and EscPress
**********************************************************************/
void InputHandler(void) {
    static long d_tmp = 0;
    if (millis() - d_tmp > 200 || LongPress) {
        // I know R3CK.. I Should NOT nest if statements..
        // but it is needed to not keep SPI bus used without need, it save resources
#if defined(USE_TFT_eSPI_TOUCH)
        TouchPoint t;
        checkPowerSaveTime();
        bool _IH_touched = tft.getTouch(&t.x, &t.y);
        if (_IH_touched) {
            NextPress = false;
            PrevPress = false;
            UpPress = false;
            DownPress = false;
            SelPress = false;
            EscPress = false;
            AnyKeyPress = false;
            NextPagePress = false;
            PrevPagePress = false;
            touchPoint.pressed = false;
            _IH_touched = false;

            // Serial.printf("\nRAW: Touch Pressed on x=%d, y=%d",t.x, t.y);
            if (bruceConfigPins.rotation == 3) {
                t.y = (tftHeight + 20) - t.y;
                t.x = tftWidth - t.x;
            }
            if (bruceConfigPins.rotation == 0) {
                int tmp = t.x;
                t.x = tftWidth - t.y;
                t.y = tmp;
            }
            if (bruceConfigPins.rotation == 2) {
                int tmp = t.x;
                t.x = t.y;
                t.y = (tftHeight + 20) - tmp;
            }
            // Serial.printf("\nROT: Touch Pressed on x=%d, y=%d\n", t.x, t.y);

            if (!wakeUpScreen()) AnyKeyPress = true;
            else goto END;

            // Touch point global variable
            touchPoint.x = t.x;
            touchPoint.y = t.y;
            touchPoint.pressed = true;
            touchHeatMap(touchPoint);
        END:
            d_tmp = millis();
        }
#endif

#ifdef HAS_BTN
        if (digitalRead(BTN_PIN) == BTN_ACT) {
            if (!wakeUpScreen()) {
                AnyKeyPress = true;
                SelPress = true;
            }
            long tmp = millis();
            while ((millis() - tmp) < 200 && digitalRead(BTN_PIN) == BTN_ACT);
        }
#endif
    }
}

/*********************************************************************
** Function: powerOff
** location: mykeyboard.cpp
** Turns off the device (or try to)
**********************************************************************/
void powerOff() {
#if defined(HAS_BTN)
    ledcWrite(TFT_BL, 0);
    tft.writecommand(0x10); // SLPIN
    esp_sleep_enable_ext0_wakeup((gpio_num_t)BTN_PIN, BTN_ACT);
#endif
    esp_deep_sleep_start();
}

/*********************************************************************
** Function: checkReboot
** location: mykeyboard.cpp
** Btn logic to turnoff the device (name is odd btw)
**********************************************************************/
void checkReboot() {
#ifdef HAS_BTN
    int c = 0;
    while (digitalRead(BTN_PIN) == BTN_ACT) {
        delay(100);
        c++;
        if (c > 20) powerOff();
    }
#endif
}
