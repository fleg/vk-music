# vk-music
Helpful utilities for vk music

## Access token
* to get access token use this [link](https://oauth.vk.com/authorize?client_id=4875633&scope=audio&redirect_uri=http://oauth.vk.com/blank.html&display=page&response_type=token)
* copy `access_token` parameter and pass it through `VK_ACCESS_TOKEN` env variable, you can also save it in `.env` file

# utilities
## dumper
Dump all music from user
Usage: `dumper --owner=12345678 --dest=./`

# TODO
* fucking captcha errors, maybe nw app?
* utility for saving albums from other users
* utility for put down album in list
