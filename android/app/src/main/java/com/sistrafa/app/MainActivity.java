package com.sistrafa.app;

import android.Manifest;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.ClipData;
import android.content.ContentValues;
import android.content.Intent;
import android.content.pm.ActivityInfo;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.print.PrintAttributes;
import android.print.PrintManager;
import android.provider.MediaStore;
import android.util.Base64;
import android.view.WindowManager;
import android.webkit.GeolocationPermissions;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

import androidx.core.content.FileProvider;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import androidx.webkit.ServiceWorkerClientCompat;
import androidx.webkit.ServiceWorkerControllerCompat;
import androidx.webkit.WebViewAssetLoader;
import androidx.webkit.WebViewFeature;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/**
 * SISTRAFA para Android: um WebView que abre o mesmo app web (HTML, CSS e JavaScript)
 * empacotado no APK. Os arquivos são servidos em https://appassets.androidplatform.net,
 * uma origem segura, para que localStorage, IndexedDB, Service Worker e Web Crypto funcionem.
 * Esta classe só cuida do que o WebView não faz sozinho: câmera e galeria, localização,
 * salvar e compartilhar arquivos, imprimir, links externos e o botão Voltar.
 */
public class MainActivity extends Activity {

    private static final String HOST = "appassets.androidplatform.net";
    private static final String INICIO = "https://" + HOST + "/index.html";
    private static final int REQ_ARQUIVO = 10, REQ_CAMERA = 11, REQ_LOCAL = 12;

    private WebView web;
    private WebViewAssetLoader carregador;
    private ValueCallback<Uri[]> retornoArquivo;
    private Uri fotoCamera;
    private GeolocationPermissions.Callback retornoLocal;
    private String origemLocal;

    @Override
    protected void onCreate(Bundle estado) {
        super.onCreate(estado);
        limparFotosAntigas();

        // sempre na vertical (também declarado no AndroidManifest)
        setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT);
        // tela cheia: o app ocupa a tela toda, inclusive a faixa do recorte da câmera
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P)
            getWindow().getAttributes().layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
        telaCheia();

        if ((getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0) WebView.setWebContentsDebuggingEnabled(true);

        carregador = new WebViewAssetLoader.Builder()
                .addPathHandler("/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        FrameLayout raiz = new FrameLayout(this);
        raiz.setBackgroundColor(Color.parseColor("#020E0E"));
        web = new WebView(this);
        web.setBackgroundColor(Color.parseColor("#020E0E"));
        raiz.addView(web, new FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));
        setContentView(raiz);
        ViewCompat.setOnApplyWindowInsetsListener(raiz, (v, insets) -> {
            // com as barras escondidas, sobra só o recorte da câmera: nenhum botão fica embaixo dele
            Insets barras = insets.getInsets(WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
            Insets teclado = insets.getInsets(WindowInsetsCompat.Type.ime());
            v.setPadding(barras.left, barras.top, barras.right, Math.max(barras.bottom, teclado.bottom));
            return WindowInsetsCompat.CONSUMED;
        });

        WebSettings ajustes = web.getSettings();
        ajustes.setJavaScriptEnabled(true);
        ajustes.setDomStorageEnabled(true);
        ajustes.setDatabaseEnabled(true);
        ajustes.setGeolocationEnabled(true);
        ajustes.setAllowFileAccess(false);
        ajustes.setTextZoom(100);   // o próprio app tem a opção de tamanho do texto

        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest req) {
                return interceptar(req.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest req) {
                return abrirFora(req.getUrl());
            }
        });
        web.setWebChromeClient(new Navegador());
        web.addJavascriptInterface(new Ponte(), "SistrafaAndroid");

        // o Service Worker também precisa receber os arquivos do APK
        if (WebViewFeature.isFeatureSupported(WebViewFeature.SERVICE_WORKER_BASIC_USAGE)
                && WebViewFeature.isFeatureSupported(WebViewFeature.SERVICE_WORKER_SHOULD_INTERCEPT_REQUEST)) {
            ServiceWorkerControllerCompat.getInstance().setServiceWorkerClient(new ServiceWorkerClientCompat() {
                @Override
                public WebResourceResponse shouldInterceptRequest(WebResourceRequest req) {
                    return interceptar(req.getUrl());
                }
            });
        }

        acompanharRede();
        if (estado != null) web.restoreState(estado);
        else web.loadUrl(INICIO);
    }

    /* O WebView não percebe sozinho quando a rede cai: sem isto, navigator.onLine fica sempre
       verdadeiro e o app não mostra o aviso "Sem internet". */
    private ConnectivityManager.NetworkCallback retornoRede;

    private void acompanharRede() {
        ConnectivityManager cm = getSystemService(ConnectivityManager.class);
        if (cm == null) return;
        retornoRede = new ConnectivityManager.NetworkCallback() {
            @Override public void onAvailable(Network n) { atualizarRede(); }
            @Override public void onLost(Network n) { atualizarRede(); }
            @Override public void onCapabilitiesChanged(Network n, NetworkCapabilities c) { atualizarRede(); }
        };
        cm.registerDefaultNetworkCallback(retornoRede);
        atualizarRede();
    }

    private void atualizarRede() {
        ConnectivityManager cm = getSystemService(ConnectivityManager.class);
        Network rede = cm == null ? null : cm.getActiveNetwork();
        NetworkCapabilities c = rede == null ? null : cm.getNetworkCapabilities(rede);
        boolean conectado = c != null && c.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET);
        runOnUiThread(() -> { if (web != null) web.setNetworkAvailable(conectado); });
    }

    /** app em segundo plano: registra a pausa da ocorrência e avisa a página (visibilidade "hidden") */
    @Override
    protected void onPause() {
        if (web != null) {
            web.evaluateJavascript("typeof Cronologia!=='undefined'&&(gravarPendente(),Cronologia.pausar('aplicativo em segundo plano ou fechado'))", null);
            web.onPause();
        }
        super.onPause();
    }

    /** de volta ao app: a página volta a ficar visível e registra a retomada */
    @Override
    protected void onResume() {
        super.onResume();
        if (web != null) web.onResume();
    }

    @Override
    protected void onDestroy() {
        ConnectivityManager cm = getSystemService(ConnectivityManager.class);
        if (cm != null && retornoRede != null) cm.unregisterNetworkCallback(retornoRede);
        super.onDestroy();
    }

    /** esconde a barra de status e a de navegação; um deslize a partir da borda as mostra por alguns segundos */
    private void telaCheia() {
        WindowInsetsControllerCompat c = new WindowInsetsControllerCompat(getWindow(), getWindow().getDecorView());
        c.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
        c.hide(WindowInsetsCompat.Type.systemBars());
    }

    @Override
    public void onWindowFocusChanged(boolean comFoco) {
        super.onWindowFocusChanged(comFoco);
        if (comFoco) telaCheia();   // volta à tela cheia depois de câmera, compartilhar, permissões etc.
    }

    /** arquivos do app vêm da pasta assets; o resto (iNaturalist, fotos de referência) vai para a internet */
    private WebResourceResponse interceptar(Uri url) {
        if (!HOST.equals(url.getHost())) return null;
        String caminho = url.getPath();
        if (caminho == null || caminho.isEmpty() || caminho.equals("/")) url = Uri.parse(INICIO);
        return carregador.shouldInterceptRequest(url);
    }

    /** telefone, links externos e páginas de outros sites abrem fora do app */
    private boolean abrirFora(Uri url) {
        if (HOST.equals(url.getHost())) return false;
        String esquema = url.getScheme() == null ? "" : url.getScheme();
        Intent i;
        if (esquema.equals("tel")) i = new Intent(Intent.ACTION_DIAL, url);
        else if (esquema.equals("http") || esquema.equals("https") || esquema.equals("mailto")) i = new Intent(Intent.ACTION_VIEW, url);
        else return true;
        try { startActivity(i); } catch (ActivityNotFoundException e) { /* nenhum app para abrir */ }
        return true;
    }

    @Override
    protected void onSaveInstanceState(Bundle estado) {
        super.onSaveInstanceState(estado);
        web.saveState(estado);
    }

    /** Voltar: fecha a janela aberta no app; senão volta uma tela; senão sai */
    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        web.evaluateJavascript("(function(){var m=document.querySelector('.modal-fundo');if(m&&typeof fecharModal==='function'){fecharModal();return 1}return 0})()", r -> {
            if ("1".equals(r)) return;
            if (web.canGoBack()) web.goBack();
            else finish();
        });
    }

    private class Navegador extends WebChromeClient {
        @Override
        public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> retorno, FileChooserParams p) {
            if (retornoArquivo != null) retornoArquivo.onReceiveValue(null);
            retornoArquivo = retorno;
            try {
                if (p.isCaptureEnabled()) {
                    // "Tirar foto": abre a câmera e grava o JPEG original num arquivo temporário do app
                    File pasta = new File(getCacheDir(), "camera");
                    pasta.mkdirs();
                    String nome = "IMG_" + new SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(new Date()) + ".jpg";
                    fotoCamera = FileProvider.getUriForFile(MainActivity.this, getPackageName() + ".arquivos", new File(pasta, nome));
                    Intent i = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
                    i.putExtra(MediaStore.EXTRA_OUTPUT, fotoCamera);
                    i.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_READ_URI_PERMISSION);
                    startActivityForResult(i, REQ_CAMERA);
                } else {
                    Intent i = p.createIntent();
                    if (p.getMode() == FileChooserParams.MODE_OPEN_MULTIPLE) i.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
                    startActivityForResult(i, REQ_ARQUIVO);
                }
                return true;
            } catch (ActivityNotFoundException e) {
                retornoArquivo = null;
                return false;
            }
        }

        @Override
        public void onGeolocationPermissionsShowPrompt(String origem, GeolocationPermissions.Callback retorno) {
            if (temLocalizacao()) { retorno.invoke(origem, true, false); return; }
            origemLocal = origem;
            retornoLocal = retorno;
            requestPermissions(new String[]{Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION}, REQ_LOCAL);
        }
    }

    private boolean temLocalizacao() {
        return checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
                || checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;
    }

    @Override
    public void onRequestPermissionsResult(int req, String[] permissoes, int[] resultados) {
        super.onRequestPermissionsResult(req, permissoes, resultados);
        if (req == REQ_LOCAL && retornoLocal != null) {
            retornoLocal.invoke(origemLocal, temLocalizacao(), false);
            retornoLocal = null;
        }
    }

    @Override
    @SuppressWarnings("deprecation")
    protected void onActivityResult(int req, int resultado, Intent dados) {
        super.onActivityResult(req, resultado, dados);
        if (req != REQ_CAMERA && req != REQ_ARQUIVO) return;
        if (retornoArquivo == null) return;
        Uri[] arquivos = null;
        if (resultado == RESULT_OK) {
            if (req == REQ_CAMERA) {
                arquivos = new Uri[]{fotoCamera};
            } else if (dados != null && dados.getClipData() != null) {
                ClipData c = dados.getClipData();
                arquivos = new Uri[c.getItemCount()];
                for (int k = 0; k < c.getItemCount(); k++) arquivos[k] = c.getItemAt(k).getUri();
            } else if (dados != null && dados.getData() != null) {
                arquivos = new Uri[]{dados.getData()};
            }
        }
        retornoArquivo.onReceiveValue(arquivos);
        retornoArquivo = null;
    }

    /** fotos temporárias da câmera já foram copiadas para o banco do app; apaga as de mais de 2 dias */
    private void limparFotosAntigas() {
        File[] lista = new File(getCacheDir(), "camera").listFiles();
        if (lista == null) return;
        long limite = System.currentTimeMillis() - 2L * 24 * 3600 * 1000;
        for (File f : lista) if (f.lastModified() < limite) f.delete();
    }

    private static String nomeSeguro(String nome) {
        String n = nome == null ? "arquivo" : nome.replaceAll("[^A-Za-z0-9._-]", "_");
        return n.isEmpty() ? "arquivo" : n;
    }

    /** chamada pelo JavaScript do app (window.SistrafaAndroid) */
    private class Ponte {
        @JavascriptInterface
        public String salvarArquivo(String base64, String nome, String tipo) {
            try {
                byte[] bytes = Base64.decode(base64, Base64.DEFAULT);
                nome = nomeSeguro(nome);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    ContentValues cv = new ContentValues();
                    cv.put(MediaStore.Downloads.DISPLAY_NAME, nome);
                    cv.put(MediaStore.Downloads.MIME_TYPE, tipo);
                    cv.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/SISTRAFA");
                    Uri u = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, cv);
                    if (u == null) return "erro: não foi possível criar o arquivo";
                    try (OutputStream o = getContentResolver().openOutputStream(u)) { o.write(bytes); }
                    return "Salvo em Downloads/SISTRAFA";
                }
                File pasta = getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
                File f = new File(pasta, nome);
                try (OutputStream o = new FileOutputStream(f)) { o.write(bytes); }
                return "Salvo em " + f.getAbsolutePath();
            } catch (Exception e) {
                return "erro: " + e.getMessage();
            }
        }

        @JavascriptInterface
        public void compartilharArquivo(String base64, String nome, String tipo) {
            try {
                File pasta = new File(getCacheDir(), "compartilhar");
                pasta.mkdirs();
                File f = new File(pasta, nomeSeguro(nome));
                try (OutputStream o = new FileOutputStream(f)) { o.write(Base64.decode(base64, Base64.DEFAULT)); }
                Uri u = FileProvider.getUriForFile(MainActivity.this, getPackageName() + ".arquivos", f);
                Intent i = new Intent(Intent.ACTION_SEND);
                i.setType(tipo);
                i.putExtra(Intent.EXTRA_STREAM, u);
                i.putExtra(Intent.EXTRA_SUBJECT, nome);
                i.setClipData(ClipData.newRawUri(nome, u));
                i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                runOnUiThread(() -> startActivity(Intent.createChooser(i, "Compartilhar relatório")));
            } catch (Exception e) {
                runOnUiThread(() -> web.evaluateJavascript("notificar('Não foi possível compartilhar.', 'erro')", null));
            }
        }

        @JavascriptInterface
        public void compartilharTexto(String titulo, String texto) {
            Intent i = new Intent(Intent.ACTION_SEND);
            i.setType("text/plain");
            i.putExtra(Intent.EXTRA_SUBJECT, titulo);
            i.putExtra(Intent.EXTRA_TEXT, texto);
            runOnUiThread(() -> startActivity(Intent.createChooser(i, "Compartilhar resumo")));
        }

        @JavascriptInterface
        public void imprimir() {
            runOnUiThread(() -> {
                PrintManager pm = (PrintManager) getSystemService(PRINT_SERVICE);
                pm.print("SISTRAFA", web.createPrintDocumentAdapter("SISTRAFA"), new PrintAttributes.Builder().build());
            });
        }
    }
}
