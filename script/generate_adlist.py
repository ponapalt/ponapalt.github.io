import urllib.request
import subprocess
from datetime import datetime

def fetch_and_process_adguard_list(url, exclusion_words):
    try:
        with urllib.request.urlopen(url) as response:
            data = response.read().decode('utf-8')
        domains = set()
        for line in data.splitlines():
            # コメント行をスキップ
            if line.startswith('#') or not line.strip():
                continue
            if line.startswith("||"):
                domain = line[2:].split("^")[0]
                # ドメインのクリーニング
                domain = domain.strip().lower()
                if not any(exclusion_word in domain for exclusion_word in exclusion_words):
                    domains.add(domain)
        adlist_lines = []
        # ヘッダー情報を追加
        adlist_lines.append(f"# Generated at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        adlist_lines.append(f"# Source: {url}")
        adlist_lines.append(f"# Total domains: {len(domains)}\n")
        
        for domain in sorted(domains):  # ドメインをソート
            adlist_lines.append(f"0.0.0.0 {domain}")
        return adlist_lines
    except Exception as e:
        print(f"Error: {e}")
        return []

def main():
    url = "https://adguardteam.github.io/AdGuardSDNSFilter/Filters/filter.txt"
    exclusion_words = [
        'amazon',
        'google',
        'doubleclick',
        'posthog',
        'everesttech',
    ]
    adlist_data = fetch_and_process_adguard_list(url, exclusion_words)
    if adlist_data:
        with open("adlist.txt", "w", encoding='utf-8') as file_adlist:
            file_adlist.write("\n".join(adlist_data))
            print("Successfully generated adlist.txt")

if __name__ == "__main__":
    main()