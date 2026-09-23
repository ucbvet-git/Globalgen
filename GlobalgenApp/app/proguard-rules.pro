# Manter interfaces JavaScript chamadas pelo WebView
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Manter classes do app principal
-keep class br.com.ucbvet.globalgen.** { *; }

# Regras padrão AndroidX
-dontwarn androidx.**
-keep class androidx.** { *; }
