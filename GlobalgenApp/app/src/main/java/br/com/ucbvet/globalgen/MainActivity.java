package br.com.ucbvet.globalgen;

import android.annotation.SuppressLint;
import android.app.AlertDialog;
import android.content.ClipData;
import android.content.Context;
import android.content.Intent;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
import android.net.Uri;
import android.os.Bundle;
import android.util.Base64;
import android.view.KeyEvent;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Button;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;
import androidx.core.content.FileProvider;

import org.json.JSONObject;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;

public class MainActivity extends AppCompatActivity {

    private static final String APP_URL = "https://ucbvet-git.github.io/Globalgen/";
    private static final String TRUSTED_HOST = "ucbvet-git.github.io";
    private static final int MAX_PDF_BYTES = 25 * 1024 * 1024;
    private static final long TEMP_FILE_MAX_AGE_MS = 24L * 60L * 60L * 1000L;

    private WebView webView;
    private ProgressBar progressBar;
    private LinearLayout errorLayout;
    private volatile boolean currentPageTrusted = false;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        webView    = findViewById(R.id.webView);
        progressBar = findViewById(R.id.progressBar);
        errorLayout = findViewById(R.id.errorLayout);

        Button retryButton = findViewById(R.id.retryButton);
        retryButton.setOnClickListener(v -> loadApp());

        configureWebView();
        cleanupOldSharedPdfs();
        loadApp();
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void configureWebView() {
        WebSettings settings = webView.getSettings();

        // JavaScript obrigatório para apps web modernas
        settings.setJavaScriptEnabled(true);

        // Suporte a armazenamento local / Service Workers
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);

        // Cache e modo offline
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setAllowFileAccess(true);

        // Zoom e viewport
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setSupportZoom(false);

        // User-agent personalizado
        settings.setUserAgentString(
            settings.getUserAgentString() + " UCBVET-Globalgen-Android/1.1.0"
        );

        // Mídia
        settings.setMediaPlaybackRequiresUserGesture(false);

        webView.setScrollBarStyle(View.SCROLLBARS_INSIDE_OVERLAY);

        // Ponte usada pela aplicação web para abrir o compartilhamento nativo
        // do Android quando navigator.share não está disponível no WebView.
        webView.addJavascriptInterface(new AndroidShareBridge(), "AndroidShare");

        // Cliente para interceptar navegação
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                // A ponte JavaScript só deve estar acessível ao site oficial.
                if (isTrustedUrl(url)) {
                    return false;
                }
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, request.getUrl()));
                } catch (Exception error) {
                    Toast.makeText(MainActivity.this,
                        "Não foi possível abrir este endereço.", Toast.LENGTH_SHORT).show();
                }
                return true;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                currentPageTrusted = isTrustedUrl(url);
                progressBar.setVisibility(View.GONE);
                errorLayout.setVisibility(View.GONE);
                webView.setVisibility(View.VISIBLE);
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request,
                                        WebResourceError error) {
                if (request.isForMainFrame()) {
                    currentPageTrusted = false;
                    progressBar.setVisibility(View.GONE);
                    webView.setVisibility(View.GONE);
                    errorLayout.setVisibility(View.VISIBLE);
                }
            }
        });

        // Barra de progresso durante carregamento
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int newProgress) {
                if (newProgress < 100) {
                    progressBar.setVisibility(View.VISIBLE);
                    progressBar.setProgress(newProgress);
                } else {
                    progressBar.setVisibility(View.GONE);
                }
            }
        });
    }

    private void loadApp() {
        if (isNetworkAvailable()) {
            errorLayout.setVisibility(View.GONE);
            progressBar.setVisibility(View.VISIBLE);
            webView.setVisibility(View.VISIBLE);
            webView.loadUrl(APP_URL);
        } else {
            progressBar.setVisibility(View.GONE);
            webView.setVisibility(View.GONE);
            errorLayout.setVisibility(View.VISIBLE);
            TextView errorMsg = findViewById(R.id.errorMessage);
            errorMsg.setText(R.string.no_internet);
        }
    }

    private boolean isTrustedUrl(String url) {
        if (url == null) return false;
        Uri uri = Uri.parse(url);
        return "https".equalsIgnoreCase(uri.getScheme())
            && TRUSTED_HOST.equalsIgnoreCase(uri.getHost());
    }

    private File getSharedPdfDirectory() {
        return new File(getCacheDir(), "shared_pdfs");
    }

    private void cleanupOldSharedPdfs() {
        File directory = getSharedPdfDirectory();
        File[] files = directory.listFiles();
        if (files == null) return;
        long cutoff = System.currentTimeMillis() - TEMP_FILE_MAX_AGE_MS;
        for (File file : files) {
            if (file.isFile() && file.lastModified() < cutoff) {
                // Arquivos temporários podem ser recriados pelo aplicativo.
                file.delete();
            }
        }
    }

    private String sanitizePdfName(String requestedName) {
        String name = requestedName == null ? "Orcamento-Globalgen.pdf" : requestedName.trim();
        name = name.replaceAll("[^\\p{L}\\p{N}._ -]", "_");
        if (name.isEmpty()) name = "Orcamento-Globalgen.pdf";
        if (!name.toLowerCase().endsWith(".pdf")) name += ".pdf";
        return name;
    }

    private void sendShareResult(boolean success, String message) {
        runOnUiThread(() -> {
            String script = "window.GBG_COMPARTILHAMENTO_ANDROID_RESULTADO && "
                + "window.GBG_COMPARTILHAMENTO_ANDROID_RESULTADO("
                + success + "," + JSONObject.quote(message) + ");";
            webView.evaluateJavascript(script, null);
            if (!success) {
                Toast.makeText(MainActivity.this, message, Toast.LENGTH_LONG).show();
            }
        });
    }

    private final class AndroidShareBridge {
        @JavascriptInterface
        public void sharePdf(String base64Pdf, String requestedName, String shareText) {
            if (!currentPageTrusted) {
                sendShareResult(false, "Compartilhamento recusado fora do site oficial.");
                return;
            }
            if (base64Pdf == null || base64Pdf.trim().isEmpty()) {
                sendShareResult(false, "O PDF não foi recebido pelo aplicativo.");
                return;
            }

            try {
                String payload = base64Pdf;
                int comma = payload.indexOf(',');
                if (comma >= 0) payload = payload.substring(comma + 1);
                byte[] bytes = Base64.decode(payload, Base64.DEFAULT);
                boolean hasPdfSignature = bytes.length >= 4
                    && bytes[0] == 0x25 && bytes[1] == 0x50
                    && bytes[2] == 0x44 && bytes[3] == 0x46;
                if (!hasPdfSignature || bytes.length > MAX_PDF_BYTES) {
                    sendShareResult(false, "O PDF é inválido, está vazio ou excede o limite de 25 MB.");
                    return;
                }

                File directory = getSharedPdfDirectory();
                if (!directory.exists() && !directory.mkdirs()) {
                    throw new IOException("Não foi possível criar o armazenamento temporário.");
                }
                cleanupOldSharedPdfs();

                File pdf = new File(directory, sanitizePdfName(requestedName));
                try (FileOutputStream output = new FileOutputStream(pdf, false)) {
                    output.write(bytes);
                    output.flush();
                }

                Uri pdfUri = FileProvider.getUriForFile(
                    MainActivity.this,
                    BuildConfig.APPLICATION_ID + ".fileprovider",
                    pdf
                );
                Intent share = new Intent(Intent.ACTION_SEND);
                share.setType("application/pdf");
                share.putExtra(Intent.EXTRA_STREAM, pdfUri);
                if (shareText != null && !shareText.trim().isEmpty()) {
                    share.putExtra(Intent.EXTRA_TEXT, shareText);
                }
                share.setClipData(ClipData.newUri(getContentResolver(), pdf.getName(), pdfUri));
                share.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

                runOnUiThread(() -> {
                    try {
                        startActivity(Intent.createChooser(share, "Compartilhar orçamento em PDF"));
                        sendShareResult(true, "Selecione o aplicativo para compartilhar o PDF.");
                    } catch (Exception error) {
                        sendShareResult(false, "Nenhum aplicativo disponível para compartilhar o PDF.");
                    }
                });
            } catch (IllegalArgumentException error) {
                sendShareResult(false, "O conteúdo recebido não é um PDF válido.");
            } catch (Exception error) {
                sendShareResult(false, "Não foi possível preparar o PDF para compartilhamento.");
            }
        }
    }

    private boolean isNetworkAvailable() {
        ConnectivityManager cm =
            (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
        if (cm == null) return false;
        NetworkInfo activeNetwork = cm.getActiveNetworkInfo();
        return activeNetwork != null && activeNetwork.isConnected();
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            new AlertDialog.Builder(this)
                .setTitle(R.string.exit_title)
                .setMessage(R.string.exit_message)
                .setPositiveButton(R.string.exit_yes, (dialog, which) -> finish())
                .setNegativeButton(R.string.exit_no, null)
                .show();
        }
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK && webView.canGoBack()) {
            webView.goBack();
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }

    @Override
    protected void onResume() {
        super.onResume();
        webView.onResume();
    }

    @Override
    protected void onPause() {
        super.onPause();
        webView.onPause();
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.destroy();
        }
        super.onDestroy();
    }
}
