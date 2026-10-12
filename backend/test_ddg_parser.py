import httpx
import re
from html import unescape
from html.parser import HTMLParser

class DDGParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.results = []
        self.current = {}
        self.in_title = False
        self.in_snippet = False
        self.in_url = False

    def handle_starttag(self, tag, attrs):
        attr_dict = dict(attrs)
        classes = attr_dict.get('class', '').split()
        if tag == 'a' and 'result__a' in classes:
            self.in_title = True
            raw_href = attr_dict.get('href', '')
            # Clean duckduckgo redirect link if present
            if 'uddg=' in raw_href:
                import urllib.parse
                parsed = urllib.parse.parse_qs(urllib.parse.urlparse(raw_href).query)
                clean_href = parsed.get('uddg', [raw_href])[0]
            else:
                clean_href = raw_href
            self.current = {'title': '', 'url': clean_href, 'snippet': ''}
        elif tag == 'a' and 'result__snippet' in classes:
            self.in_snippet = True

    def handle_endtag(self, tag):
        if tag == 'a' and self.in_title:
            self.in_title = False
        elif tag == 'a' and self.in_snippet:
            self.in_snippet = False
            if self.current.get('title'):
                self.results.append(self.current)
                self.current = {}

    def handle_data(self, data):
        if self.in_title and self.current:
            self.current['title'] += data
        elif self.in_snippet and self.current:
            self.current['snippet'] += data

def search_ddg(query: str):
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
    }
    r = httpx.post('https://html.duckduckgo.com/html/', data={'q': query}, headers=headers, follow_redirects=True, timeout=10.0)
    parser = DDGParser()
    parser.feed(r.text)
    return parser.results

if __name__ == '__main__':
    items = search_ddg('youtube.com')
    print(f"Extracted {len(items)} items:")
    for item in items[:4]:
        print(item)
