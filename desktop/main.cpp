// Etherwake for Windows: a small native window around Microsoft Edge WebView2, which ships with Windows 10 and 11.
//
// The game itself is ../index.html, and its music ../music/spaceify.webm. Both are compiled into this exe as resources
// and served from memory at
// https://etherwake.example/, so the exe is the whole game: no installer, no browser window, no network.
// Saves are the page's localStorage, kept in WebView2's profile under %LOCALAPPDATA%\Etherwake.
//
// The page and this window talk through WebView2 messages. The page posts 'fullscreen:on', 'fullscreen:off', 'quit'
// and 'save-log:<text>', which this answers with 'log-saved:<file name>' or 'log-failed'. A run's log comes as
// 'run-log:<file name>\n<text>' and is written over its earlier copy into a 'runs' folder beside the exe, but only if that
// folder already exists (a development build has one; a shipped game does not, so it writes nothing). The answer is
// 'run-log-saved:<file name>' or 'run-log-skipped'. When the window is closed,
// this calls window.etherwakeSave() in the page, hides the window, and waits for WebView2 to shut down cleanly so the
// save is on disk before the process ends.
//
// Start with --debug to get DevTools (F12) and the browser's right-click menu. The end-to-end test starts it with
// --remote-debugging-port=N to drive the game over the DevTools protocol; nothing else on the command line is used.

#ifndef UNICODE
#define UNICODE
#endif
#ifndef _UNICODE
#define _UNICODE
#endif
#ifndef _WIN32_WINNT
#define _WIN32_WINNT 0x0A00  // Windows 10, the oldest version WebView2 still supports
#endif
#define WIN32_LEAN_AND_MEAN
#define NOMINMAX
#include <windows.h>
#include <objbase.h>
#include <dwmapi.h>
#include <shellapi.h>
#include <shlobj.h>
#include <shlwapi.h>

#include <algorithm>
#include <cwchar>
#include <functional>
#include <string>
#include <utility>

#include "WebView2.h"
#include "resource.h"
#ifdef _MSC_VER
#include "WebView2EnvironmentOptions.h"  // the SDK's options object; it needs WRL, which comes with Visual Studio
#endif

namespace {

constexpr wchar_t kTitle[] = L"Etherwake";
constexpr wchar_t kOrigin[] = L"https://etherwake.example/";
constexpr wchar_t kFilter[] = L"https://etherwake.example/*";
constexpr wchar_t kRuntimeDownload[] = L"https://go.microsoft.com/fwlink/p/?LinkId=2124703";
// The page is inline script and style plus an embedded font; the only other thing it loads is its music, from here.
constexpr wchar_t kPageHeaders[] =
    L"Content-Type: text/html; charset=utf-8\n"
    L"Cache-Control: no-store\n"
    L"Content-Security-Policy: default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; "
    L"font-src data:; img-src data: blob:; media-src 'self'; base-uri 'none'; form-action 'none'";
constexpr wchar_t kMusicPath[] = L"music/spaceify.webm";  // the page's music, as the page asks for it

// The palette from index.html, so the window frame matches the game and nothing flashes white while it loads.
constexpr COLORREF kBg = RGB(7, 8, 11);       // --bg
constexpr COLORREF kLine = RGB(43, 50, 61);   // --line, the window border on Windows 11
constexpr COLORREF kInk = RGB(230, 232, 234);  // --ink, the title text on Windows 11

constexpr int kWidth = 1280, kHeight = 800;  // client size at 100% scaling
constexpr int kMinWidth = 960, kMinHeight = 600;
constexpr UINT kSaved = WM_APP + 1;    // the page has saved
constexpr UINT kStopped = WM_APP + 2;  // the engine has exited, its storage written, so the window can go
constexpr UINT_PTR kSaveTimer = 1;     // carries on if the page never answers
constexpr UINT_PTR kSettleTimer = 2;   // gives the save time to reach the engine's storage
constexpr UINT_PTR kStopTimer = 3;     // closes anyway if the engine never reports back
constexpr UINT kSaveWaitMs = 2000, kSettleMs = 750, kStopWaitMs = 5000, kStopWaitOldMs = 1500;

// DWM attributes newer than some SDK headers
constexpr DWORD kDarkModeOld = 19, kDarkMode = 20, kBorderColor = 34, kCaptionColor = 35, kTextColor = 36;

// Owns one COM reference.
template <typename T>
struct Com {
  T* p = nullptr;
  Com() = default;
  Com(const Com&) = delete;
  Com& operator=(const Com&) = delete;
  ~Com() { reset(); }
  void reset() {
    if (p) p->Release();
    p = nullptr;
  }
  T** put() {
    reset();
    return &p;
  }
  T* operator->() const { return p; }
  explicit operator bool() const { return p != nullptr; }
  template <typename U>
  bool as(const IID& iid, Com<U>& out) const {
    return p && SUCCEEDED(p->QueryInterface(iid, reinterpret_cast<void**>(out.put())));
  }
};

// One small COM object per callback: WebView2 calls Invoke, which runs the function it was made with.
// It starts with one reference, which the caller drops once WebView2 has taken its own.
template <typename Iface, typename... Args>
class Callback final : public Iface {
 public:
  Callback(const IID& iid, std::function<HRESULT(Args...)> fn) : iid_(iid), fn_(std::move(fn)) {}
  HRESULT STDMETHODCALLTYPE QueryInterface(REFIID riid, void** out) override {
    if (!out) return E_POINTER;
    if (IsEqualIID(riid, IID_IUnknown) || IsEqualIID(riid, iid_)) {
      *out = static_cast<Iface*>(this);
      AddRef();
      return S_OK;
    }
    *out = nullptr;
    return E_NOINTERFACE;
  }
  ULONG STDMETHODCALLTYPE AddRef() override { return static_cast<ULONG>(InterlockedIncrement(&refs_)); }
  ULONG STDMETHODCALLTYPE Release() override {
    const LONG n = InterlockedDecrement(&refs_);
    if (n == 0) delete this;
    return static_cast<ULONG>(n);
  }
  HRESULT STDMETHODCALLTYPE Invoke(Args... args) override { return fn_(args...); }

 private:
  const IID& iid_;
  std::function<HRESULT(Args...)> fn_;
  LONG refs_ = 1;
};

using EnvironmentCreated =
    Callback<ICoreWebView2CreateCoreWebView2EnvironmentCompletedHandler, HRESULT, ICoreWebView2Environment*>;
using ControllerCreated =
    Callback<ICoreWebView2CreateCoreWebView2ControllerCompletedHandler, HRESULT, ICoreWebView2Controller*>;
using ScriptDone = Callback<ICoreWebView2ExecuteScriptCompletedHandler, HRESULT, LPCWSTR>;
using ResourceRequested = Callback<ICoreWebView2WebResourceRequestedEventHandler, ICoreWebView2*,
                                   ICoreWebView2WebResourceRequestedEventArgs*>;
using MessageReceived =
    Callback<ICoreWebView2WebMessageReceivedEventHandler, ICoreWebView2*, ICoreWebView2WebMessageReceivedEventArgs*>;
using NavigationStarting =
    Callback<ICoreWebView2NavigationStartingEventHandler, ICoreWebView2*, ICoreWebView2NavigationStartingEventArgs*>;
using NewWindowRequested =
    Callback<ICoreWebView2NewWindowRequestedEventHandler, ICoreWebView2*, ICoreWebView2NewWindowRequestedEventArgs*>;
using ProcessFailed =
    Callback<ICoreWebView2ProcessFailedEventHandler, ICoreWebView2*, ICoreWebView2ProcessFailedEventArgs*>;
using BrowserExited = Callback<ICoreWebView2BrowserProcessExitedEventHandler, ICoreWebView2Environment*,
                               ICoreWebView2BrowserProcessExitedEventArgs*>;

// Closing is two steps, so a save made at the last moment reaches the disk: see CloseAfterSaving.
enum class Closing { No, Saving, Settling, Stopping };

struct App {
  HWND window = nullptr;
  Com<ICoreWebView2Environment> env;
  Com<ICoreWebView2Controller> controller;
  Com<ICoreWebView2> webview;
  const BYTE* html = nullptr;
  UINT htmlSize = 0;
  const BYTE* music = nullptr;  // optional: without it the page plays its synthesised music
  UINT musicSize = 0;
  bool debug = false;
  bool fullscreen = false;
  Closing closing = Closing::No;
  WINDOWPLACEMENT placement{};
};
App app;

bool StartsWith(const wchar_t* text, const wchar_t* prefix) {
  return text && std::wcsncmp(text, prefix, std::wcslen(prefix)) == 0;
}

void Fail(const wchar_t* what, HRESULT hr) {
  wchar_t text[320];
  wsprintfW(text, L"%s (error 0x%08X).\n\nTry starting Etherwake again.", what, static_cast<unsigned>(hr));
  MessageBoxW(app.window, text, kTitle, MB_OK | MB_ICONERROR);
  app.closing = Closing::Stopping;
  if (app.window) DestroyWindow(app.window);
  else PostQuitMessage(1);
}

// ---------- Window ----------

// The outer size of a window whose client area is w x h at 100% scaling, on the window's current monitor.
SIZE FrameFor(HWND hwnd, int w, int h) {
  const UINT dpi = GetDpiForWindow(hwnd);
  RECT r{0, 0, MulDiv(w, static_cast<int>(dpi), 96), MulDiv(h, static_cast<int>(dpi), 96)};
  AdjustWindowRectExForDpi(&r, static_cast<DWORD>(GetWindowLongW(hwnd, GWL_STYLE)), FALSE,
                           static_cast<DWORD>(GetWindowLongW(hwnd, GWL_EXSTYLE)), dpi);
  return {r.right - r.left, r.bottom - r.top};
}

// Centres the window on its monitor at 1280 x 800, or as much of a small screen as fits.
void PlaceWindow(HWND hwnd) {
  MONITORINFO mi{};
  mi.cbSize = sizeof(mi);
  GetMonitorInfoW(MonitorFromWindow(hwnd, MONITOR_DEFAULTTOPRIMARY), &mi);
  const RECT& work = mi.rcWork;
  const LONG workW = work.right - work.left, workH = work.bottom - work.top;
  SIZE size = FrameFor(hwnd, kWidth, kHeight);
  size.cx = std::min(size.cx, workW * 94 / 100);
  size.cy = std::min(size.cy, workH * 94 / 100);
  SetWindowPos(hwnd, nullptr, work.left + (workW - size.cx) / 2, work.top + (workH - size.cy) / 2, size.cx, size.cy,
               SWP_NOZORDER | SWP_NOACTIVATE);
}

// A dark title bar always, and on Windows 11 a frame in the game's own colours. Older versions ignore what they lack.
void StyleFrame(HWND hwnd) {
  const BOOL dark = TRUE;
  if (FAILED(DwmSetWindowAttribute(hwnd, kDarkMode, &dark, sizeof(dark))))
    DwmSetWindowAttribute(hwnd, kDarkModeOld, &dark, sizeof(dark));
  DwmSetWindowAttribute(hwnd, kCaptionColor, &kBg, sizeof(kBg));
  DwmSetWindowAttribute(hwnd, kBorderColor, &kLine, sizeof(kLine));
  DwmSetWindowAttribute(hwnd, kTextColor, &kInk, sizeof(kInk));
}

// Borderless fullscreen on the window's monitor; leaving it puts the window back exactly where it was.
void SetFullscreen(bool on) {
  if (on == app.fullscreen || !app.window) return;
  const LONG style = GetWindowLongW(app.window, GWL_STYLE);
  if (on) {
    MONITORINFO mi{};
    mi.cbSize = sizeof(mi);
    app.placement.length = sizeof(app.placement);
    if (!GetWindowPlacement(app.window, &app.placement) ||
        !GetMonitorInfoW(MonitorFromWindow(app.window, MONITOR_DEFAULTTOPRIMARY), &mi))
      return;
    SetWindowLongW(app.window, GWL_STYLE, style & ~WS_OVERLAPPEDWINDOW);
    SetWindowPos(app.window, HWND_TOP, mi.rcMonitor.left, mi.rcMonitor.top, mi.rcMonitor.right - mi.rcMonitor.left,
                 mi.rcMonitor.bottom - mi.rcMonitor.top, SWP_NOOWNERZORDER | SWP_FRAMECHANGED);
  } else {
    SetWindowLongW(app.window, GWL_STYLE, style | WS_OVERLAPPEDWINDOW);
    SetWindowPlacement(app.window, &app.placement);
    SetWindowPos(app.window, nullptr, 0, 0, 0, 0,
                 SWP_NOMOVE | SWP_NOSIZE | SWP_NOZORDER | SWP_NOOWNERZORDER | SWP_FRAMECHANGED);
  }
  app.fullscreen = on;
}

void FitWebView() {
  if (!app.controller || !app.window) return;
  RECT r{};
  GetClientRect(app.window, &r);
  app.controller->put_Bounds(r);
}

void FocusWebView() {
  if (app.controller) app.controller->MoveFocus(COREWEBVIEW2_MOVE_FOCUS_REASON_PROGRAMMATIC);
}

// ---------- WebView2 ----------

// "bytes=START-" or "bytes=START-END" from a Range header, as a media player asks for a file in pieces. Anything else
// (several ranges, a range from the end) answers false, and the whole file is sent instead.
bool ParseRange(const wchar_t* v, UINT size, UINT& from, UINT& to) {
  if (!v || !size || std::wcsncmp(v, L"bytes=", 6) != 0) return false;
  wchar_t* end = nullptr;
  const unsigned long long a = std::wcstoull(v + 6, &end, 10);
  if (end == v + 6 || *end != L'-') return false;
  const wchar_t* rest = end + 1;
  unsigned long long b = size - 1;
  if (*rest) {
    b = std::wcstoull(rest, &end, 10);
    if (end == rest || *end) return false;
  }
  if (a >= size || b < a) return false;
  from = static_cast<UINT>(a);
  to = static_cast<UINT>(std::min<unsigned long long>(b, size - 1));
  return true;
}

// The music, whole or the byte range asked for.
void ServeMusic(ICoreWebView2WebResourceRequest* request, ICoreWebView2WebResourceRequestedEventArgs* args) {
  UINT from = 0, to = app.musicSize - 1;
  bool partial = false;
  Com<ICoreWebView2HttpRequestHeaders> headers;
  LPWSTR range = nullptr;
  if (SUCCEEDED(request->get_Headers(headers.put())) && headers.p && SUCCEEDED(headers.p->GetHeader(L"Range", &range)) &&
      range) {
    partial = ParseRange(range, app.musicSize, from, to);
    CoTaskMemFree(range);
  }
  Com<IStream> body;
  body.p = SHCreateMemStream(app.music + from, to - from + 1);
  std::wstring h = L"Content-Type: audio/webm\nAccept-Ranges: bytes\nCache-Control: no-store\n";
  if (partial)
    h += L"Content-Range: bytes " + std::to_wstring(from) + L"-" + std::to_wstring(to) + L"/" +
         std::to_wstring(app.musicSize) + L"\n";
  Com<ICoreWebView2WebResourceResponse> response;
  if (SUCCEEDED(app.env->CreateWebResourceResponse(body.p, partial ? 206 : 200, partial ? L"Partial Content" : L"OK",
                                                    h.c_str(), response.put())))
    args->put_Response(response.p);
}

// Every request to https://etherwake.example/ is answered from memory: the page itself, its music, or 404 for anything
// else.
HRESULT Serve(ICoreWebView2*, ICoreWebView2WebResourceRequestedEventArgs* args) {
  Com<ICoreWebView2WebResourceRequest> request;
  LPWSTR uri = nullptr;
  if (FAILED(args->get_Request(request.put())) || FAILED(request->get_Uri(&uri)) || !uri) return S_OK;
  bool page = false, music = false;
  if (StartsWith(uri, kOrigin)) {
    std::wstring path(uri + std::wcslen(kOrigin));
    path = path.substr(0, path.find_first_of(L"?#"));
    page = path.empty() || path == L"index.html";
    music = path == kMusicPath && app.music && app.musicSize;
  }
  CoTaskMemFree(uri);
  if (music) {
    ServeMusic(request.p, args);
    return S_OK;
  }

  Com<IStream> body;
  if (page) body.p = SHCreateMemStream(app.html, app.htmlSize);
  Com<ICoreWebView2WebResourceResponse> response;
  if (SUCCEEDED(app.env->CreateWebResourceResponse(body.p, page ? 200 : 404, page ? L"OK" : L"Not Found",
                                                    page ? kPageHeaders : L"", response.put())))
    args->put_Response(response.p);
  return S_OK;
}

// The balance log's "Save as file": written as UTF-8 to the player's Downloads folder, rather than through a
// browser download and its download panel. The page is told the file name, or that it failed, for its toast.
void SaveLog(const wchar_t* text) {
  PWSTR downloads = nullptr;
  std::wstring base, dir;
  if (SUCCEEDED(SHGetKnownFolderPath(FOLDERID_Downloads, KF_FLAG_CREATE, nullptr, &downloads)) && downloads) {
    SYSTEMTIME t{};
    GetLocalTime(&t);
    wchar_t stamp[48];
    wsprintfW(stamp, L"etherwake-log-%04u%02u%02u-%02u%02u%02u", t.wYear, t.wMonth, t.wDay, t.wHour, t.wMinute,
              t.wSecond);
    base = stamp;
    dir = std::wstring(downloads) + L"\\";
  }
  CoTaskMemFree(downloads);

  bool ok = false;
  std::wstring name;
  const int n = WideCharToMultiByte(CP_UTF8, 0, text, -1, nullptr, 0, nullptr, nullptr);  // counts the terminator
  if (!dir.empty() && n > 0) {
    std::string utf8(static_cast<size_t>(n), '\0');
    WideCharToMultiByte(CP_UTF8, 0, text, -1, utf8.data(), n, nullptr, nullptr);
    utf8.resize(static_cast<size_t>(n - 1));
    // Two saves in the same second get -2, -3 ... rather than the second one failing.
    for (int k = 1; k <= 50 && !ok; k++) {
      name = base + (k > 1 ? L"-" + std::to_wstring(k) : L"") + L".txt";
      HANDLE file = CreateFileW((dir + name).c_str(), GENERIC_WRITE, 0, nullptr, CREATE_NEW, FILE_ATTRIBUTE_NORMAL, nullptr);
      if (file == INVALID_HANDLE_VALUE) {
        if (GetLastError() != ERROR_FILE_EXISTS) break;
        continue;
      }
      DWORD written = 0;
      ok = WriteFile(file, utf8.data(), static_cast<DWORD>(utf8.size()), &written, nullptr) && written == utf8.size();
      CloseHandle(file);
      break;
    }
  }
  app.webview->PostWebMessageAsString(ok ? (L"log-saved:" + name).c_str() : L"log-failed");
}

// A run's log (Phase 8): 'run-log:<name>\n<text>'. Written over its earlier copy into <exe folder>\runs, which is never
// created here: no folder, no file. Only a plain name ending in .txt is accepted, so the page cannot write anywhere else.
void SaveRunLog(const wchar_t* arg) {
  const wchar_t* nl = std::wcschr(arg, L'\n');
  bool ok = false;
  std::wstring name;
  if (nl && nl > arg && nl - arg <= 96) {
    name.assign(arg, nl - arg);
    ok = name.size() > 4 && name.compare(name.size() - 4, 4, L".txt") == 0 && name.find(L"..") == std::wstring::npos;
    for (wchar_t c : name)
      if (!((c >= L'a' && c <= L'z') || (c >= L'A' && c <= L'Z') || (c >= L'0' && c <= L'9') || c == L'-' || c == L'_' || c == L'.'))
        ok = false;
  }
  if (ok) {
    wchar_t exe[MAX_PATH * 2];
    const DWORD len = GetModuleFileNameW(nullptr, exe, ARRAYSIZE(exe));
    ok = len > 0 && len < ARRAYSIZE(exe);
    std::wstring dir;
    if (ok) {
      dir.assign(exe, len);
      dir.resize(dir.find_last_of(L'\\') + 1);
      dir += L"runs";
      const DWORD attr = GetFileAttributesW(dir.c_str());
      ok = attr != INVALID_FILE_ATTRIBUTES && (attr & FILE_ATTRIBUTE_DIRECTORY);
    }
    const wchar_t* text = nl + 1;
    const int n = WideCharToMultiByte(CP_UTF8, 0, text, -1, nullptr, 0, nullptr, nullptr);  // counts the terminator
    if (ok && n > 0) {
      std::string utf8(static_cast<size_t>(n), '\0');
      WideCharToMultiByte(CP_UTF8, 0, text, -1, utf8.data(), n, nullptr, nullptr);
      utf8.resize(static_cast<size_t>(n - 1));
      HANDLE file = CreateFileW((dir + L"\\" + name).c_str(), GENERIC_WRITE, 0, nullptr, CREATE_ALWAYS, FILE_ATTRIBUTE_NORMAL, nullptr);
      ok = file != INVALID_HANDLE_VALUE;
      if (ok) {
        DWORD written = 0;
        ok = WriteFile(file, utf8.data(), static_cast<DWORD>(utf8.size()), &written, nullptr) && written == utf8.size();
        CloseHandle(file);
      }
    } else {
      ok = false;
    }
  }
  app.webview->PostWebMessageAsString(ok ? (L"run-log-saved:" + name).c_str() : L"run-log-skipped");
}

HRESULT OnMessage(ICoreWebView2*, ICoreWebView2WebMessageReceivedEventArgs* args) {
  LPWSTR source = nullptr, text = nullptr;
  const bool ours = SUCCEEDED(args->get_Source(&source)) && StartsWith(source, kOrigin);
  CoTaskMemFree(source);
  if (!ours || FAILED(args->TryGetWebMessageAsString(&text)) || !text) return S_OK;
  if (std::wcscmp(text, L"fullscreen:on") == 0) SetFullscreen(true);
  else if (std::wcscmp(text, L"fullscreen:off") == 0) SetFullscreen(false);
  else if (std::wcscmp(text, L"quit") == 0) PostMessageW(app.window, WM_CLOSE, 0, 0);
  else if (StartsWith(text, L"save-log:")) SaveLog(text + std::wcslen(L"save-log:"));
  else if (StartsWith(text, L"run-log:")) SaveRunLog(text + std::wcslen(L"run-log:"));
  CoTaskMemFree(text);
  return S_OK;
}

// The game never leaves its own page. This also stops a file dropped on the window from replacing it.
HRESULT OnNavigation(ICoreWebView2*, ICoreWebView2NavigationStartingEventArgs* args) {
  LPWSTR uri = nullptr;
  if (SUCCEEDED(args->get_Uri(&uri)) && !StartsWith(uri, kOrigin)) args->put_Cancel(TRUE);
  CoTaskMemFree(uri);
  return S_OK;
}

HRESULT OnProcessFailed(ICoreWebView2* sender, ICoreWebView2ProcessFailedEventArgs* args) {
  COREWEBVIEW2_PROCESS_FAILED_KIND kind{};
  if (app.closing != Closing::No || !app.window || FAILED(args->get_ProcessFailedKind(&kind))) return S_OK;
  if (kind == COREWEBVIEW2_PROCESS_FAILED_KIND_BROWSER_PROCESS_EXITED) {
    MessageBoxW(app.window, L"The game engine stopped unexpectedly. Your last autosave is kept.", kTitle,
                MB_OK | MB_ICONERROR);
    app.closing = Closing::Stopping;
    DestroyWindow(app.window);
  } else if (kind == COREWEBVIEW2_PROCESS_FAILED_KIND_RENDER_PROCESS_EXITED ||
             kind == COREWEBVIEW2_PROCESS_FAILED_KIND_RENDER_PROCESS_UNRESPONSIVE) {
    sender->Reload();
  }
  return S_OK;
}

// A game, not a browser: no zoom, no browser shortcuts, no right-click menu, no swipe or pinch.
void Configure() {
  Com<ICoreWebView2Settings> s;
  if (FAILED(app.webview->get_Settings(s.put()))) return;
  const BOOL debug = app.debug ? TRUE : FALSE;
  s->put_AreDevToolsEnabled(debug);
  s->put_AreDefaultContextMenusEnabled(debug);
  s->put_IsStatusBarEnabled(FALSE);
  s->put_IsZoomControlEnabled(FALSE);
  s->put_AreHostObjectsAllowed(FALSE);
  Com<ICoreWebView2Settings3> s3;
  if (s.as(IID_ICoreWebView2Settings3, s3)) s3->put_AreBrowserAcceleratorKeysEnabled(debug);
  Com<ICoreWebView2Settings4> s4;
  if (s.as(IID_ICoreWebView2Settings4, s4)) {
    s4->put_IsGeneralAutofillEnabled(FALSE);
    s4->put_IsPasswordAutosaveEnabled(FALSE);
  }
  Com<ICoreWebView2Settings5> s5;
  if (s.as(IID_ICoreWebView2Settings5, s5)) s5->put_IsPinchZoomEnabled(FALSE);
  Com<ICoreWebView2Settings6> s6;
  if (s.as(IID_ICoreWebView2Settings6, s6)) s6->put_IsSwipeNavigationEnabled(FALSE);

  Com<ICoreWebView2Controller2> c2;
  if (app.controller.as(IID_ICoreWebView2Controller2, c2)) c2->put_DefaultBackgroundColor({255, 7, 8, 11});
  Com<ICoreWebView2Controller4> c4;
  if (app.controller.as(IID_ICoreWebView2Controller4, c4)) c4->put_AllowExternalDrop(FALSE);
}

void Listen() {
  EventRegistrationToken token{};
  auto* serve = new ResourceRequested(IID_ICoreWebView2WebResourceRequestedEventHandler, Serve);
  app.webview->add_WebResourceRequested(serve, &token);
  serve->Release();
  app.webview->AddWebResourceRequestedFilter(kFilter, COREWEBVIEW2_WEB_RESOURCE_CONTEXT_ALL);

  auto* message = new MessageReceived(IID_ICoreWebView2WebMessageReceivedEventHandler, OnMessage);
  app.webview->add_WebMessageReceived(message, &token);
  message->Release();

  auto* navigation = new NavigationStarting(IID_ICoreWebView2NavigationStartingEventHandler, OnNavigation);
  app.webview->add_NavigationStarting(navigation, &token);
  navigation->Release();

  auto* popup = new NewWindowRequested(IID_ICoreWebView2NewWindowRequestedEventHandler,
                                       [](ICoreWebView2*, ICoreWebView2NewWindowRequestedEventArgs* args) {
                                         return args->put_Handled(TRUE);
                                       });
  app.webview->add_NewWindowRequested(popup, &token);
  popup->Release();

  auto* failed = new ProcessFailed(IID_ICoreWebView2ProcessFailedEventHandler, OnProcessFailed);
  app.webview->add_ProcessFailed(failed, &token);
  failed->Release();
}

HRESULT OnController(HRESULT hr, ICoreWebView2Controller* controller) {
  if (!app.window || app.closing != Closing::No) return S_OK;
  if (FAILED(hr) || !controller) {
    Fail(L"Etherwake could not start its game engine", hr);
    return S_OK;
  }
  controller->AddRef();
  app.controller.p = controller;
  if (FAILED(controller->get_CoreWebView2(app.webview.put()))) {
    Fail(L"Etherwake could not start its game engine", E_FAIL);
    return S_OK;
  }
  Configure();
  Listen();
  FitWebView();
  controller->put_IsVisible(IsIconic(app.window) ? FALSE : TRUE);
  app.webview->Navigate(kOrigin);
  if (GetForegroundWindow() == app.window) FocusWebView();
  return S_OK;
}

HRESULT OnEnvironment(HRESULT hr, ICoreWebView2Environment* env) {
  if (!app.window || app.closing != Closing::No) return S_OK;
  if (FAILED(hr) || !env) {
    Fail(L"Etherwake could not start its game engine", hr);
    return S_OK;
  }
  env->AddRef();
  app.env.p = env;
  auto* done = new ControllerCreated(IID_ICoreWebView2CreateCoreWebView2ControllerCompletedHandler, OnController);
  hr = env->CreateCoreWebView2Controller(app.window, done);
  done->Release();
  if (FAILED(hr)) Fail(L"Etherwake could not start its game engine", hr);
  return S_OK;
}

// Closing, step one: the window disappears at once and the page saves. A localStorage write takes a moment to reach
// the engine's storage, and the Windows test lost saves when the engine was shut down straight after, so step two
// waits kSettleMs first. WebView2 has no call to flush storage.
void CloseAfterSaving() {
  app.closing = Closing::Saving;
  ShowWindow(app.window, SW_HIDE);
  SetTimer(app.window, kSaveTimer, kSaveWaitMs, nullptr);
  auto* done = new ScriptDone(IID_ICoreWebView2ExecuteScriptCompletedHandler, [](HRESULT, LPCWSTR) {
    if (app.window) PostMessageW(app.window, kSaved, 0, 0);
    return S_OK;
  });
  if (FAILED(app.webview->ExecuteScript(L"window.etherwakeSave&&window.etherwakeSave()", done)))
    PostMessageW(app.window, kSaved, 0, 0);
  done->Release();
}

void Settle() {
  app.closing = Closing::Settling;
  KillTimer(app.window, kSaveTimer);
  SetTimer(app.window, kSettleTimer, kSettleMs, nullptr);
}

// Step two: the engine shuts down cleanly, writing out its storage as it goes. The process waits for the engine to
// report that it has exited (WebView2's BrowserProcessExited), then ends.
void StopEngine() {
  app.closing = Closing::Stopping;
  KillTimer(app.window, kSaveTimer);
  KillTimer(app.window, kSettleTimer);
  Com<ICoreWebView2Environment5> env5;
  if (app.env.as(IID_ICoreWebView2Environment5, env5)) {
    EventRegistrationToken token{};
    auto* exited = new BrowserExited(IID_ICoreWebView2BrowserProcessExitedEventHandler,
                                     [](ICoreWebView2Environment*, ICoreWebView2BrowserProcessExitedEventArgs*) {
                                       if (app.window) PostMessageW(app.window, kStopped, 0, 0);
                                       return S_OK;
                                     });
    env5->add_BrowserProcessExited(exited, &token);
    exited->Release();
    SetTimer(app.window, kStopTimer, kStopWaitMs, nullptr);
  } else {
    SetTimer(app.window, kStopTimer, kStopWaitOldMs, nullptr);  // an old runtime cannot say when it is done
  }
  if (app.controller) app.controller->Close();
  app.webview.reset();
  app.controller.reset();
}

LRESULT CALLBACK WindowProc(HWND hwnd, UINT msg, WPARAM wp, LPARAM lp) {
  switch (msg) {
    case WM_SIZE:
      if (app.controller) {
        app.controller->put_IsVisible(wp == SIZE_MINIMIZED ? FALSE : TRUE);  // a minimised game stops drawing
        FitWebView();
      }
      return 0;
    case WM_MOVE:
      if (app.controller) app.controller->NotifyParentWindowPositionChanged();
      return 0;
    case WM_ACTIVATE: {
      const LRESULT r = DefWindowProcW(hwnd, msg, wp, lp);
      if (LOWORD(wp) != WA_INACTIVE) FocusWebView();
      return r;
    }
    case WM_SETFOCUS:
      FocusWebView();
      return 0;
    case WM_GETMINMAXINFO:
      if (!app.fullscreen) {
        const SIZE min = FrameFor(hwnd, kMinWidth, kMinHeight);
        reinterpret_cast<MINMAXINFO*>(lp)->ptMinTrackSize = {min.cx, min.cy};
      }
      return 0;
    case WM_DPICHANGED: {
      const RECT* r = reinterpret_cast<const RECT*>(lp);
      SetWindowPos(hwnd, nullptr, r->left, r->top, r->right - r->left, r->bottom - r->top,
                   SWP_NOZORDER | SWP_NOACTIVATE);
      return 0;
    }
    case WM_SYSCOMMAND:
      // Alt or F10 on its own would open an invisible menu and swallow the next keys the player presses.
      if ((wp & 0xFFF0) == SC_KEYMENU && lp == 0) return 0;
      break;
    case WM_CLOSE:
      if (app.closing == Closing::No) {
        if (app.webview) CloseAfterSaving();
        else DestroyWindow(hwnd);  // the engine never started, so there is nothing to save
      }
      return 0;  // already on its way out
    case kSaved:
      if (app.closing == Closing::Saving) Settle();
      return 0;
    case kStopped:
      if (app.closing == Closing::Stopping) {
        KillTimer(hwnd, kStopTimer);
        DestroyWindow(hwnd);
      }
      return 0;
    case WM_TIMER:
      if (wp == kSaveTimer && app.closing == Closing::Saving) StopEngine();
      else if (wp == kSettleTimer && app.closing == Closing::Settling) StopEngine();
      else if (wp == kStopTimer && app.closing == Closing::Stopping) {
        KillTimer(hwnd, kStopTimer);
        DestroyWindow(hwnd);
      } else break;
      return 0;
    case WM_DESTROY:
      if (app.controller) app.controller->Close();
      app.webview.reset();
      app.controller.reset();
      app.env.reset();
      app.window = nullptr;
      PostQuitMessage(0);
      return 0;
  }
  return DefWindowProcW(hwnd, msg, wp, lp);
}

// --remote-debugging-port=N from the command line, the only browser argument the exe accepts.
[[maybe_unused]] std::wstring BrowserArguments() {
  int argc = 0;
  LPWSTR* argv = CommandLineToArgvW(GetCommandLineW(), &argc);
  std::wstring args;
  for (int i = 1; argv && i < argc; i++)
    if (StartsWith(argv[i], L"--remote-debugging-port=")) args = argv[i];
  LocalFree(argv);
  return args;
}

std::wstring DataFolder() {
  PWSTR base = nullptr;
  std::wstring folder;
  if (SUCCEEDED(SHGetKnownFolderPath(FOLDERID_LocalAppData, KF_FLAG_CREATE, nullptr, &base)) && base)
    folder = std::wstring(base) + L"\\Etherwake";
  CoTaskMemFree(base);
  return folder;
}

}  // namespace

int WINAPI wWinMain(HINSTANCE instance, HINSTANCE, PWSTR, int show) {
  app.debug = std::wcsstr(GetCommandLineW(), L"--debug") != nullptr;

  HRSRC res = FindResourceW(instance, MAKEINTRESOURCEW(IDR_GAME), RT_RCDATA);
  HGLOBAL data = res ? LoadResource(instance, res) : nullptr;
  app.html = data ? static_cast<const BYTE*>(LockResource(data)) : nullptr;
  app.htmlSize = res ? SizeofResource(instance, res) : 0;
  HRSRC mres = FindResourceW(instance, MAKEINTRESOURCEW(IDR_MUSIC), RT_RCDATA);
  HGLOBAL mdata = mres ? LoadResource(instance, mres) : nullptr;
  app.music = mdata ? static_cast<const BYTE*>(LockResource(mdata)) : nullptr;
  app.musicSize = mres ? SizeofResource(instance, mres) : 0;
  if (!app.html || !app.htmlSize) {
    MessageBoxW(nullptr, L"This copy of Etherwake is damaged. Download it again.", kTitle, MB_OK | MB_ICONERROR);
    return 1;
  }

  LPWSTR version = nullptr;
  if (FAILED(GetAvailableCoreWebView2BrowserVersionString(nullptr, &version)) || !version) {
    if (MessageBoxW(nullptr,
                    L"Etherwake runs on the Microsoft Edge WebView2 Runtime. It comes with Windows 11 and most "
                    L"Windows 10 PCs, but this one does not have it.\n\nOpen Microsoft's download page now?",
                    kTitle, MB_YESNO | MB_ICONINFORMATION) == IDYES)
      ShellExecuteW(nullptr, L"open", kRuntimeDownload, nullptr, nullptr, SW_SHOWNORMAL);
    return 1;
  }
  CoTaskMemFree(version);

  if (FAILED(CoInitializeEx(nullptr, COINIT_APARTMENTTHREADED))) return 1;
  // The game's background before the first frame, rather than WebView2's default white.
  SetEnvironmentVariableW(L"WEBVIEW2_DEFAULT_BACKGROUND_COLOR", L"FF07080B");

  WNDCLASSEXW wc{};
  wc.cbSize = sizeof(wc);
  wc.lpfnWndProc = WindowProc;
  wc.hInstance = instance;
  wc.hIcon = static_cast<HICON>(LoadImageW(instance, MAKEINTRESOURCEW(IDI_APP), IMAGE_ICON,
                                           GetSystemMetrics(SM_CXICON), GetSystemMetrics(SM_CYICON), 0));
  wc.hIconSm = static_cast<HICON>(LoadImageW(instance, MAKEINTRESOURCEW(IDI_APP), IMAGE_ICON,
                                             GetSystemMetrics(SM_CXSMICON), GetSystemMetrics(SM_CYSMICON), 0));
  wc.hCursor = LoadCursorW(nullptr, IDC_ARROW);
  wc.hbrBackground = CreateSolidBrush(kBg);
  wc.lpszClassName = L"Etherwake";
  if (!RegisterClassExW(&wc)) return 1;

  // Open on the monitor the player launched from.
  POINT cursor{};
  GetCursorPos(&cursor);
  MONITORINFO mi{};
  mi.cbSize = sizeof(mi);
  GetMonitorInfoW(MonitorFromPoint(cursor, MONITOR_DEFAULTTOPRIMARY), &mi);
  app.window = CreateWindowExW(0, wc.lpszClassName, kTitle, WS_OVERLAPPEDWINDOW, mi.rcWork.left, mi.rcWork.top, 640,
                               480, nullptr, nullptr, instance, nullptr);
  if (!app.window) return 1;
  StyleFrame(app.window);
  PlaceWindow(app.window);
  ShowWindow(app.window, show);
  UpdateWindow(app.window);

  const std::wstring folder = DataFolder();
  Com<ICoreWebView2EnvironmentOptions> options;
#ifdef _MSC_VER
  const std::wstring args = BrowserArguments();
  if (!args.empty()) {
    auto made = Microsoft::WRL::Make<CoreWebView2EnvironmentOptions>();
    if (made && SUCCEEDED(made->put_AdditionalBrowserArguments(args.c_str()))) options.p = made.Detach();
  }
#endif
  auto* created = new EnvironmentCreated(IID_ICoreWebView2CreateCoreWebView2EnvironmentCompletedHandler, OnEnvironment);
  const HRESULT hr = CreateCoreWebView2EnvironmentWithOptions(nullptr, folder.empty() ? nullptr : folder.c_str(),
                                                              options.p, created);
  created->Release();
  if (FAILED(hr)) Fail(L"Etherwake could not start its game engine", hr);

  MSG msg{};
  while (GetMessageW(&msg, nullptr, 0, 0) > 0) {
    TranslateMessage(&msg);
    DispatchMessageW(&msg);
  }
  CoUninitialize();
  return static_cast<int>(msg.wParam);
}
