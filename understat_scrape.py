import json
import pandas as pd
import requests
from bs4 import BeautifulSoup

base_url = "https://understat.com/match"
first_game_id = 28778

res = requests.get(f"{base_url}/{first_game_id}")
soup = BeautifulSoup(res.content, 'lxml')
scripts = soup.find_all('script')

#print(scripts)

strings  = scripts[2].string
#print(strings)

ind_start =strings.index("('")+2
ind_end = strings.index("')")
json_data = strings[ind_start:ind_end]
#print(json_data)

json_data = json_data.encode('utf-8').decode('unicode_escape')

data = json.loads(json_data)

for k, v in data.items():
    if not isinstance(v, (list, dict)):
        print(f'  {k}: {v}')