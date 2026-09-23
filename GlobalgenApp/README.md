# Globalgen Android App
**Aplicativo Android para acesso ao sistema Globalgen – UCBVET**

URL da aplicação web: `https://ucbvet-git.github.io/Globalgen/`

---

## Pré-requisitos

| Ferramenta | Versão mínima | Link |
|---|---|---|
| Android Studio | Hedgehog (2023.1.1) ou superior | https://developer.android.com/studio |
| JDK | 17 ou superior | Incluso no Android Studio |
| Android SDK | API 34 | Instalar via Android Studio |

---

## Como compilar e instalar

### Opção 1 – Android Studio (recomendado)

1. Abra o **Android Studio**
2. **File → Open** → selecione a pasta `GlobalgenApp`
3. Aguarde a sincronização do Gradle (pode levar alguns minutos na primeira vez)
4. Conecte o celular Android via USB com **Depuração USB** ativada
   - Vá em **Configurações → Sobre o telefone → Número da versão** (toque 7x)
   - Depois em **Opções do desenvolvedor → Depuração USB**
5. Clique em **▶ Run** (ou Shift+F10)
6. O APK será instalado automaticamente no dispositivo

### Opção 2 – Gerar APK para distribuição

1. No Android Studio: **Build → Generate Signed Bundle / APK**
2. Selecione **APK**
3. Crie ou selecione um **Keystore** (certificado de assinatura)
4. Selecione o build type **release**
5. O APK assinado estará em `app/release/app-release.apk`
6. Distribua o APK internamente (MDM, e-mail, link de download)

### Opção 3 – Linha de comando

```bash
# Na pasta GlobalgenApp:
./gradlew assembleDebug          # APK de teste
./gradlew assembleRelease        # APK de produção (requer keystore)

# O APK fica em:
# app/build/outputs/apk/debug/app-debug.apk
# app/build/outputs/apk/release/app-release-unsigned.apk
```

---

## Estrutura do projeto

```
GlobalgenApp/
├── app/
│   └── src/main/
│       ├── java/br/com/ucbvet/globalgen/
│       │   ├── SplashActivity.java   ← Tela de abertura
│       │   └── MainActivity.java     ← WebView principal
│       ├── res/
│       │   ├── layout/               ← Layouts XML
│       │   ├── values/               ← Cores, strings, temas
│       │   └── mipmap-*/             ← Ícones do app
│       └── AndroidManifest.xml
├── build.gradle
├── settings.gradle
└── gradle.properties
```

---

## Funcionalidades

- ✅ Carrega `https://ucbvet-git.github.io/Globalgen/` em WebView nativo
- ✅ Splash screen com identidade visual UCBVET (verde)
- ✅ Barra de progresso durante carregamento
- ✅ Detecção de ausência de internet com botão "Tentar novamente"
- ✅ Botão Voltar navega pelo histórico do WebView
- ✅ Confirmação antes de fechar o app
- ✅ JavaScript habilitado
- ✅ DOM Storage / LocalStorage habilitado
- ✅ Compartilhamento nativo de orçamentos em PDF no Android
- ✅ Arquivos compartilhados por URI temporária segura (`FileProvider`)
- ✅ Links externos abertos fora do WebView para proteger a ponte nativa
- ✅ Compatible com Android 5.0+ (API 21+)

## Integração de compartilhamento do PDF

A aplicação web publicada deve chamar a ponte `AndroidShare.sharePdf(...)` quando ela estiver disponível. A versão **Orçamento GBG v5.0.4** já contém essa integração e mantém `navigator.share` como alternativa para os navegadores comuns.

---

## Personalização

- **Cor principal**: edite `#2E7D32` em `res/values/colors.xml`
- **Nome do app**: edite em `res/values/strings.xml`
- **ID do pacote**: edite `applicationId` em `app/build.gradle`

---

*Projeto gerado para Grupo UCBVET – ti@ucbvet.com.br*
