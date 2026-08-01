import os
import sys
import time
import json
import urllib.request
import unittest
from http.server import HTTPServer
import threading

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
import server

class TestHistoricalBugsRegression(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.port = 8090
        cls.base_url = f"http://127.0.0.1:{cls.port}"
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

    def test_bug_heartbeat_cancellation(self):
        """
        Bug Fix Regression: POST /unload initiates a shutdown timer, but a GET /ping
        must cancel the timer so active page refreshes or open tabs prevent premature shutdown.
        """
        # Send /unload POST request
        req = urllib.request.Request(f"{self.base_url}/unload", data=b'', method='POST')
        with urllib.request.urlopen(req) as resp:
            self.assertEqual(resp.status, 200)

        self.assertIsNotNone(server.shutdown_timer)

        # Ping should cancel the timer
        ping_req = urllib.request.Request(f"{self.base_url}/ping")
        with urllib.request.urlopen(ping_req) as resp:
            self.assertEqual(resp.status, 200)

        self.assertIsNone(server.shutdown_timer)

    def test_bug_userdata_resilience(self):
        """
        Bug Fix Regression: /userdata GET should handle corrupted or missing user_data.json gracefully.
        """
        req = urllib.request.Request(f"{self.base_url}/userdata")
        with urllib.request.urlopen(req) as resp:
            self.assertEqual(resp.status, 200)
            data = json.loads(resp.read().decode('utf-8'))
            self.assertIn('watchlist', data)
            self.assertIn('ottPlatforms', data)

if __name__ == '__main__':
    unittest.main()
