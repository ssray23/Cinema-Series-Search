import os
import sys
import http.server
import socketserver
import threading

PORT = 8080
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

shutdown_timer = None

def cancel_shutdown():
    global shutdown_timer
    if shutdown_timer:
        shutdown_timer.cancel()
        shutdown_timer = None

class ShutdownServer(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def do_POST(self):
        if self.path == '/unload':
            global shutdown_timer
            def terminate():
                print("\nNo active tabs detected. Shutting down server...")
                import subprocess
                try:
                    # Attempt to gracefully quit the macOS app wrapper so the Dock icon disappears
                    script = 'tell application "System Events" to if exists application process "Cinema Search" then tell application "Cinema Search" to quit'
                    subprocess.call(['osascript', '-e', script], stderr=subprocess.DEVNULL, timeout=0.5)
                except:
                    pass
                os._exit(0)
            
            # Start a 1.5 second countdown to shutdown. 
            # If a ping or new request comes in (e.g. from another tab or a refresh), it will be cancelled.
            if shutdown_timer is None:
                shutdown_timer = threading.Timer(1.5, terminate)
                shutdown_timer.start()
            
            self.send_response(200)
            self.end_headers()
            return
        
        self.send_response(404)
        self.end_headers()

    def do_GET(self):
        cancel_shutdown()
        
        if self.path == '/ping':
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b"pong")
            return

        if self.path == '/shutdown':
            self.send_response(200)
            self.send_header('Content-type', 'text/html')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(b"Shutting down server...")
            print("Shutdown request received. Exiting...")
            
            def hard_terminate():
                import subprocess
                try:
                    script = 'tell application "System Events" to if exists application process "Cinema Search" then tell application "Cinema Search" to quit'
                    subprocess.call(['osascript', '-e', script], stderr=subprocess.DEVNULL, timeout=0.5)
                except:
                    pass
                os._exit(0)
                
            threading.Thread(target=hard_terminate).start()
            return
        return super().do_GET()

    def log_message(self, format, *args):
        # Mute log for /ping and /unload to avoid console spam
        if "GET /ping" in args[0] or "POST /unload" in args[0]:
            return
        super().log_message(format, *args)

    def end_headers(self):
        # Force the browser to never cache files (CSS/JS/HTML) during development
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

def run():
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), ShutdownServer) as httpd:
        print(f"Serving CineSearch at http://localhost:{PORT}")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            pass

if __name__ == '__main__':
    run()
