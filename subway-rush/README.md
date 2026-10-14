# Subway Rush

An original browser-based endless runner inspired by the endless-runner genre.

## Play
After GitHub Pages deploys, open:
https://123idkgames456.github.io/ikirumi-stuff/subway-rush/

## Features
- Three-lane endless runner with keyboard and touch controls
- Collectible coins, saved wallet, saved best score, and run count using localStorage
- Unlockable and equippable character skins
- Boss encounters during runs
- Experimental direct peer-to-peer friend connection using WebRTC data channels and manual invite/reply text exchange
- Responsive layout for desktop and mobile

## Controls
- Left / A: move left
- Right / D: move right
- Up / W / Space: jump
- Down / S: slide
- Escape / P: pause

## Multiplayer connection
1. One player presses **Create Invite** and sends the generated connection text to the other player.
2. The other player pastes it and presses **Process / Connect**.
3. They send the generated reply text back to the host.
4. The host pastes the reply and presses **Process / Connect**.

Peer-to-peer connectivity depends on browser/network support. This prototype does not use a matchmaking server, and the connection text must be exchanged out of band.

## Saving
Progress is saved in this browser on this device. Clearing site data or switching browsers/devices can remove or separate progress. There is no shared online leaderboard or server-backed save system.

This project uses original placeholder visuals and does not include Subway Surfers assets.