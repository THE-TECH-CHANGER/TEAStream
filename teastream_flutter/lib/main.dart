import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:webview_flutter/webview_flutter.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const TEAstreamApp());
}

class TEAstreamApp extends StatelessWidget {
  const TEAstreamApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'TEAstream',
      debugShowCheckedModeBanner: false,
      theme: ThemeData.dark().copyWith(
        scaffoldBackgroundColor: const Color(0xFF0D1117),
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFF10B981),
          secondary: Color(0xFF00FFCC),
          surface: Color(0xFF161B22),
        ),
      ),
      home: const DashboardWebViewScreen(),
    );
  }
}

class DashboardWebViewScreen extends StatefulWidget {
  const DashboardWebViewScreen({super.key});

  @override
  State<DashboardWebViewScreen> createState() => _DashboardWebViewScreenState();
}

class _DashboardWebViewScreenState extends State<DashboardWebViewScreen> {
  late final WebViewController _controller;
  String _serverUrl = 'http://localhost:3000';
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadSavedServerUrl();
  }

  Future<void> _loadSavedServerUrl() async {
    final prefs = await SharedPreferences.getInstance();
    final saved = prefs.getString('teastream_server_url');
    if (saved != null && saved.isNotEmpty) {
      _serverUrl = saved;
    }

    _initWebViewController();
  }

  void _initWebViewController() {
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(const Color(0xFF0D1117))
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageStarted: (String url) {
            setState(() => _isLoading = true);
          },
          onPageFinished: (String url) {
            setState(() => _isLoading = false);
          },
          onWebResourceError: (WebResourceError error) {
            setState(() => _isLoading = false);
          },
        ),
      )
      ..loadRequest(Uri.parse(_serverUrl));
  }

  Future<void> _showServerDialog() async {
    final textController = TextEditingController(text: _serverUrl);
    await showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: const Color(0xFF161B22),
        title: const Text('TEAstream Server Address', style: TextStyle(color: Colors.white)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Enter your TEAstream Hub address (e.g. your PC or MacBook IP):',
              style: TextStyle(color: Colors.white70, fontSize: 13),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: textController,
              style: const TextStyle(color: Colors.white, fontFamily: 'monospace'),
              decoration: const InputDecoration(
                hintText: 'http://192.168.1.5:3000',
                border: OutlineInputBorder(),
                filled: true,
                fillColor: Color(0xFF0D1117),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel', style: TextStyle(color: Colors.white60)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF10B981),
            ),
            onPressed: () async {
              String input = textController.text.trim();
              if (!input.startsWith('http://') && !input.startsWith('https://')) {
                input = 'http://$input';
              }
              final prefs = await SharedPreferences.getInstance();
              await prefs.setString('teastream_server_url', input);
              setState(() {
                _serverUrl = input;
              });
              _controller.loadRequest(Uri.parse(input));
              if (mounted) Navigator.pop(context);
            },
            child: const Text('Connect', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: const Color(0xFF161B22),
        elevation: 1,
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: const Color(0xFF10B981).withOpacity(0.2),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.local_cafe, color: Color(0xFF10B981), size: 18),
            ),
            const SizedBox(width: 10),
            const Text(
              'TEAstream',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Reload Dashboard',
            onPressed: () => _controller.reload(),
          ),
          IconButton(
            icon: const Icon(Icons.settings_ethernet),
            tooltip: 'Change Relay Server Address',
            onPressed: _showServerDialog,
          ),
        ],
      ),
      body: Stack(
        children: [
          WebViewWidget(controller: _controller),
          if (_isLoading)
            const Center(
              child: CircularProgressIndicator(color: Color(0xFF10B981)),
            ),
        ],
      ),
    );
  }
}
