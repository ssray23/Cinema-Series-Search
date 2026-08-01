import os
import sys
import json
import time
import urllib.request
import unittest
from http.server import HTTPServer
import threading

# Add workspace directory to python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
import server

class TestServerAPI(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Use port 8089 for isolated automated testing
        cls.port = 8089
        cls.base_url = f"http://127.0.0.1:{cls.port}"
        
        # Override directory in server module
        server.DIRECTORY = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        
        cls.httpd = HTTPServer(("127.0.0.1", cls.port), server.ShutdownServer)
        cls.server_thread = threading.Thread(target=cls.httpd.serve_forever)
        cls.server_thread.daemon = True
        cls.server_thread.start()
        time.sleep(0.1)

    @classmethod
    def tearDownClass(cls):
        cls.httpd.shutdown()
        cls.httpd.server_close()

    def test_ping_endpoint(self):
        req = urllib.request.Request(f"{self.base_url}/ping")
        with urllib.request.urlopen(req) as resp:
            self.assertEqual(resp.status, 200)
            self.assertEqual(resp.read().decode('utf-8'), "pong")

    def test_no_cache_headers(self):
        req = urllib.request.Request(f"{self.base_url}/ping")
        with urllib.request.urlopen(req) as resp:
            headers = dict(resp.headers)
            self.assertEqual(headers.get('Cache-Control'), 'no-cache, no-store, must-revalidate')
            self.assertEqual(headers.get('Pragma'), 'no-cache')
            self.assertEqual(headers.get('Expires'), '0')

    def test_keys_get_and_post(self):
        # Test GET /keys
        req = urllib.request.Request(f"{self.base_url}/keys")
        with urllib.request.urlopen(req) as resp:
            self.assertEqual(resp.status, 200)
            data = json.loads(resp.read().decode('utf-8'))
            self.assertIn('TMDB_API_KEY', data)
            self.assertIn('WATCHMODE_API_KEY', data)
            self.assertIn('GEMINI_API_KEY', data)
            self.assertIn('ANTHROPIC_API_KEY', data)

    def test_userdata_get_and_post(self):
        # Test GET /userdata
        req = urllib.request.Request(f"{self.base_url}/userdata")
        with urllib.request.urlopen(req) as resp:
            self.assertEqual(resp.status, 200)
            data = json.loads(resp.read().decode('utf-8'))
            self.assertIsInstance(data, dict)

if __name__ == '__main__':
    unittest.main()
