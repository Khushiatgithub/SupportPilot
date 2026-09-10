import os
import csv
import random
from datetime import datetime, timedelta

# =============================================================================
# Scaled Kaggle TWCS Spotify Dataset Generator (1,000+ Clean Conversations)
# =============================================================================

INTENT_TEMPLATES = {
    "BILLING_SUBSCRIPTION_CHARGES": {
        "true_intent": "SUBSCRIPTION_BILLING",
        "customer_templates": [
            "@SpotifyCares I was charged twice for my Spotify Family plan this month ({price} x 2). Can I get a refund for the duplicate transaction?",
            "@SpotifyCares How do I change my payment method from {pay_method1} to {pay_method2} for Premium monthly subscription?",
            "@SpotifyCares Cancelled my subscription last week but still got billed {price} today. Please check invoice #{inv_num}.",
            "@SpotifyCares Why is there an unexpected extra ${tax_amount} tax charge on my annual subscription receipt?",
            "@SpotifyCares Payment failed when renewing with {card_type} card. Bank says transaction was blocked by merchant.",
            "@SpotifyCares I requested a refund {days} days ago for an accidental renewal charge. Where is my credit refund?",
            "@SpotifyCares Can I get an official PDF invoice for business accounting and corporate expense filing?",
            "@SpotifyCares My subscription price jumped from {price_old} to {price_new} without advance notification on my billing statement.",
            "@SpotifyCares Tried to redeem a ${gift_val} Spotify gift card code but it gives error 'Card code already used or invalid'.",
            "@SpotifyCares If I downgrade from Premium to Free tier mid-cycle, do I get a prorated refund credit for unused days?",
            "@SpotifyCares Billed twice on {pay_method1} and {pay_method2} subscriptions simultaneously for the same account.",
            "@SpotifyCares Why was my premium subscription charged in {currency} instead of my local currency?",
            "@SpotifyCares I updated my credit card details but my account is still showing payment past due and downgraded to Free.",
            "@SpotifyCares Can I pay for a 12-month annual Spotify subscription upfront to get a discounted rate?",
            "@SpotifyCares Auto-renew was turned off on my account yet I was still charged {price} yesterday morning. Please reverse."
        ],
        "agent_templates": [
            "@{user} Hey! We'd be glad to look into this charge. Send us a DM with your account email and we'll sort out the refund: https://spoti.fi/dm -{agent}",
            "@{user} Hi! Head to your Account overview at spotify.com/account, find 'Your plan', and click 'Update' next to payment details. -{agent}",
            "@{user} Hello! We'd be happy to investigate this. Send us a private DM with your registered email and we'll check your billing status: https://spoti.fi/dm -{agent}",
            "@{user} Hi! Sales tax or VAT is calculated based on local jurisdiction laws. DM us your receipt and postal code to verify! -{agent}",
            "@{user} Hey! Please verify international transactions are enabled on your card, or try PayPal as a secondary billing method. -{agent}",
            "@{user} Hello! Refunds typically take 3-5 business days depending on your bank. Send us a DM with your reference ID to check. -{agent}",
            "@{user} Hi there! You can download VAT invoices directly from your Receipts page at spotify.com/account/receipts. -{agent}",
            "@{user} Hey! We sent email notifications regarding updated pricing tiers in your region. DM us your username if you didn't receive it! -{agent}",
            "@{user} Hi! Make sure your account region matches the country where the gift card was purchased. DM us the card receipt for help! -{agent}",
            "@{user} Hello! Premium features stay active until the end of your prepaid billing period, with no further charges after that. -{agent}",
            "@{user} Hey! Send us a DM with both transaction IDs so we can cancel the redundant third-party billing and process a refund. -{agent}",
            "@{user} Hi! Your billing currency is tied to your account country settings. DM us your account username to update your country! -{agent}"
        ]
    },
    "AUDIO_PLAYBACK_STREAMING": {
        "true_intent": "AUDIO_STREAMING_ISSUES",
        "customer_templates": [
            "@SpotifyCares Songs keep skipping after 5 seconds on {net_type}, but audio works fine on WiFi streaming.",
            "@SpotifyCares Music audio keeps stuttering and buffering constantly during playback on {browser_or_os}.",
            "@SpotifyCares Audio crackling and popping sound distortion on high volume through {audio_device}.",
            "@SpotifyCares Tracks randomly pause every {pause_mins} minutes by themselves while phone screen is locked on {mobile_os}.",
            "@SpotifyCares Explicit songs won't play even though explicit content filter is turned ON in settings.",
            "@SpotifyCares Song playback gets cut off {cutoff_secs} seconds before the track actually finishes playing.",
            "@SpotifyCares Streaming quality sounds muffled and low bitrate even though 'Very High Quality' is selected.",
            "@SpotifyCares Audio volume suddenly drops by 50% whenever a podcast transitions to a music track.",
            "@SpotifyCares Getting playback error code 'Spotify can't play this right now' on {desktop_os}.",
            "@SpotifyCares Left audio channel has no sound output while right channel plays normally on {mobile_device}.",
            "@SpotifyCares Crossfade transition between songs causes a 2-second loud audio buzz artifact on {mobile_os}.",
            "@SpotifyCares What audio bitrate does Spotify HiFi / Very High quality stream at on desktop vs mobile?",
            "@SpotifyCares Music volume is extremely quiet compared to YouTube and Apple Music on max volume on {mobile_device}.",
            "@SpotifyCares Gapless playback is not working for continuous live concert albums on {mobile_os} app version {app_ver}.",
            "@SpotifyCares Playback automatically stops whenever I open {other_app} in the background on my phone."
        ],
        "agent_templates": [
            "@{user} Hey! Check your streaming quality under Settings > Audio Quality. Toggle 'Download using cellular' if streaming offline tracks. -{agent}",
            "@{user} Hi! Make sure hardware acceleration is enabled in your app/browser settings and clear your cache for open.spotify.com. -{agent}",
            "@{user} Hello! Go to Settings > Audio Quality > Normalize volume, and set Volume Level to 'Normal' or 'Quiet' to prevent clipping. -{agent}",
            "@{user} Hi! Check your phone's battery optimization settings and set Spotify to 'Unrestricted' background activity. -{agent}",
            "@{user} Hey! Log out and log back in to refresh account settings. If on a Family plan, the plan manager might have set restrictions. -{agent}",
            "@{user} Hi! Disable Crossfade in Settings > Playback or clear app cache to fix premature audio cutoffs. -{agent}",
            "@{user} Hey! Turn off 'Auto adjust quality' in Audio Quality settings so it doesn't downgrade on variable connection speeds. -{agent}",
            "@{user} Hi! Podcasts use dynamic audio leveling. You can adjust Equalizer presets under Playback settings to balance output. -{agent}",
            "@{user} Hello! Try toggling Hardware Acceleration under Edit > Preferences > Compatibility on your desktop app. -{agent}",
            "@{user} Hey! Check Settings > Playback > Mono Audio toggle to make sure stereo panning is balanced properly. -{agent}",
            "@{user} Hi! Very High streaming streams at 320 kbps AAC/Ogg Vorbis on Premium. Details here: https://spoti.fi/audio-quality -{agent}"
        ]
    },
    "APP_PERFORMANCE_STABILITY": {
        "true_intent": "APP_CRASH_FREEZE",
        "customer_templates": [
            "@SpotifyCares Spotify keeps crashing on {desktop_os} upon launch. Crash log generated #{crash_id}.",
            "@SpotifyCares App crashes immediately upon tapping the 'Your Library' tab on {mobile_os}.",
            "@SpotifyCares {desktop_os} app displays a blank completely black screen after login and won't load UI.",
            "@SpotifyCares Mobile app is causing severe battery drain and phone overheating on {mobile_device}.",
            "@SpotifyCares Desktop client consuming over {ram_gb}GB of RAM memory in task manager while idling.",
            "@SpotifyCares App freezes completely when opening playlists with more than {track_count} songs on {mobile_device}.",
            "@SpotifyCares Keep getting logged out of the mobile app every time I close it on {mobile_os}.",
            "@SpotifyCares App crashes when attempting to view artist about biography page with high-res photos.",
            "@SpotifyCares Infinite loading spinner when trying to search for songs or artist profiles on {mobile_os}.",
            "@SpotifyCares {car_platform} screen freezes completely when opening Spotify playlists while driving.",
            "@SpotifyCares App hangs and becomes unresponsive when opening the Equalizer menu on {mobile_device}.",
            "@SpotifyCares Desktop app will not open on {desktop_os} startup even though 'Open Spotify automatically' is enabled.",
            "@SpotifyCares Updating to Spotify version {app_ver} causes constant crash on startup on {mobile_device}.",
            "@SpotifyCares App UI flickers and restarts every time bluetooth connects or disconnects in the car.",
            "@SpotifyCares Search tab is completely unresponsive and keyboard does not pop up on {mobile_os}."
        ],
        "agent_templates": [
            "@{user} Hi! Let's do a clean reinstall to resolve crashing. Follow the step-by-step guide here: https://spoti.fi/reinstall -{agent}",
            "@{user} Hey! Try clearing app storage and cache under Settings > Storage > Clear Cache, then restart your device. -{agent}",
            "@{user} Hello! Try deleting the Spotify AppData/cache folder or reinstalling the desktop client from spotify.com/download. -{agent}",
            "@{user} Hi! Disable 'Canvas' looping visuals under Settings > Playback to reduce background battery and CPU consumption. -{agent}",
            "@{user} Hey! Try disabling hardware acceleration in the Spotify Desktop menu (File/Edit > Hardware Acceleration) and restart. -{agent}",
            "@{user} Hi there! Does this happen on both WiFi and cellular? Let us know your Spotify version and OS build in DM! -{agent}",
            "@{user} Hello! Reinstalling the app usually fixes persistent login session drops. Send us a DM if the issue continues! -{agent}",
            "@{user} Hey! Send us a DM with your device model, OS version, and Spotify app version so our tech team can investigate: https://spoti.fi/dm -{agent}"
        ]
    },
    "DEVICE_SMART_SPEAKER_CONNECT": {
        "true_intent": "SMART_DEVICE_INTEGRATION",
        "customer_templates": [
            "@SpotifyCares Spotify Connect on my {smart_speaker} is constantly stuttering and pausing mid-song.",
            "@SpotifyCares My {speaker_brand} speakers can no longer find Spotify Connect after the firmware update.",
            "@SpotifyCares {tv_brand} app gets stuck on loading logo when launching Spotify Connect from phone.",
            "@SpotifyCares Can I use Spotify Connect to stream across multiple speakers in different rooms at the same time?",
            "@SpotifyCares {voice_assistant} says 'Something went wrong, please try again' when asking to play Spotify playlists.",
            "@SpotifyCares {smart_watch} won't sync Spotify offline playlists via WiFi connection error code #{sync_code}.",
            "@SpotifyCares {game_console} game audio volume slider doesn't balance background Spotify music properly.",
            "@SpotifyCares {streaming_device} audio is 3 seconds out of sync with video podcasts on TV.",
            "@SpotifyCares Chromecast Audio icon missing from Spotify devices menu on local home WiFi network.",
            "@SpotifyCares Is there an official Spotify app for {smart_watch} with offline playback?",
            "@SpotifyCares Spotify Connect switches output playback to my {smart_speaker} randomly when I come home.",
            "@SpotifyCares Can't connect Spotify to {car_audio_brand} receiver via Bluetooth auto-connect.",
            "@SpotifyCares Volume controls on {smart_speaker} don't respond when adjusting volume from the phone app.",
            "@SpotifyCares Spotify Connect device list keeps disappearing and reappearing every few seconds on {desktop_os}.",
            "@SpotifyCares Voice commands on {voice_assistant} only play 30-second previews instead of full songs on Premium."
        ],
        "agent_templates": [
            "@{user} Hey! Unlink and re-link your Spotify account in the Alexa/Google Home companion app to refresh the token. -{agent}",
            "@{user} Hi! Power cycle your router and speakers, and make sure both your phone and speakers are on the same 2.4GHz/5GHz WiFi band. -{agent}",
            "@{user} Hello! Try reinstalling the Spotify app on your Smart TV or clearing TV app cache from TV system settings. -{agent}",
            "@{user} Hi! Multi-room audio is supported through speaker groups created in the Google Home, Alexa, or Sonos companion app! -{agent}",
            "@{user} Hey! Make sure Spotify is set as the default music provider in your voice assistant settings. DM us if you need help! -{agent}",
            "@{user} Hi there! Check our smart watch setup guide here: https://spoti.fi/wearables to ensure proper offline sync setup. -{agent}",
            "@{user} Hello! On consoles, open Spotify in the quick menu overlay and adjust the Sound/Mix balance slider. -{agent}",
            "@{user} Hey! Send us a DM with your speaker brand, router model, and Spotify app version so we can assist: https://spoti.fi/dm -{agent}"
        ]
    },
    "ACCOUNT_LOGIN_SECURITY": {
        "true_intent": "ACCOUNT_LOGIN_ACCESS",
        "customer_templates": [
            "@SpotifyCares Can't log into my account. Password reset email is not arriving in my inbox or spam folder for {email_dom}.",
            "@SpotifyCares Received a security alert about a login from {foreign_country} on my account. I live in {home_country}.",
            "@SpotifyCares Account locked after entering wrong password {failed_attempts} times. How long does the temporary security lockout last?",
            "@SpotifyCares Someone in another country accessed my account and changed my playlist names. I think I got hacked!",
            "@SpotifyCares Cannot sign in using Facebook login button, getting 'OAuth error {oauth_code} invalid credentials'.",
            "@SpotifyCares Two-factor authentication (2FA) SMS OTP code is not arriving on my mobile phone number ending in {phone_last4}.",
            "@SpotifyCares Accidentally clicked delete account on GDPR page. Can support restore my deleted profile?",
            "@SpotifyCares How do I change my registered email address on Spotify without losing my saved songs and playlists?",
            "@SpotifyCares Can I transfer my playlist ownership and followers to another Spotify user account?",
            "@SpotifyCares Can I merge two Spotify accounts ({user_acc1} and {user_acc2}) into one without losing my playlists?",
            "@SpotifyCares Spotify says my account was disabled due to suspicious activity. How do I verify my identity?",
            "@SpotifyCares I didn't receive the verification email to confirm my new email change request.",
            "@SpotifyCares How do I sign out of all devices remotely if I left my account logged in at a public computer?",
            "@SpotifyCares Getting 'Firewall may be blocking Spotify' error code {firewall_code} when trying to log in on work laptop.",
            "@SpotifyCares Third party app revoked my Spotify access. How do I view and remove authorized apps on my profile?"
        ],
        "agent_templates": [
            "@{user} Hi! Check your spam/junk folder, or add no-reply@spotify.com to your email whitelist. DM us your username if still missing! -{agent}",
            "@{user} Hey! We recommend going to spotify.com/account and clicking 'Sign out everywhere', then resetting your password immediately. -{agent}",
            "@{user} Hello! Temporary lockouts reset automatically after 30 minutes. You can also reset your password at spotify.com/password-reset. -{agent}",
            "@{user} Hi! Send us a DM with your account's email and invoice details right away so we can secure your profile: https://spoti.fi/dm -{agent}",
            "@{user} Hey! Try disconnecting and reconnecting Facebook under spotify.com/account > Apps, or reset your password using your email. -{agent}",
            "@{user} Hello! DM us your registered email and phone number and we'll help verify your 2FA authentication settings. -{agent}",
            "@{user} Hi there! Deleted accounts can be restored within 7 days. Send us a private DM with your account details immediately! -{agent}",
            "@{user} Hey! You can change your email anytime directly under your Account overview at spotify.com/account. -{agent}"
        ]
    },
    "OFFLINE_PLAYLISTS_DOWNLOAD": {
        "true_intent": "OFFLINE_DOWNLOAD_SYNC",
        "customer_templates": [
            "@SpotifyCares Downloaded songs are greyed out and unplayable in offline mode on airplane flight.",
            "@SpotifyCares My offline playlists keep disappearing on {mobile_os} every time I restart the app! Any fix?",
            "@SpotifyCares How do I change download storage location to my external micro SD card on {mobile_device}?",
            "@SpotifyCares Playlist download toggle gets stuck spinning at 'Waiting to download... (0 of {download_songs} songs)'.",
            "@SpotifyCares What is the maximum download limit of songs allowed per device on Spotify Premium?",
            "@SpotifyCares Offline songs taking up {storage_gb}GB of storage even after deleting downloaded albums from library.",
            "@SpotifyCares Downloaded local MP3 files on desktop are not syncing over WiFi to my {mobile_device} Spotify library.",
            "@SpotifyCares I accidentally deleted my favorite playlist with {playlist_size} songs! Can I recover it?",
            "@SpotifyCares Playlist folder structure disappeared and all playlists are now unorganized in one huge list.",
            "@SpotifyCares Reordering tracks inside a custom playlist doesn't sync across desktop and mobile apps.",
            "@SpotifyCares Songs downloaded on Premium won't play offline unless I reconnect to internet once every {days} days.",
            "@SpotifyCares Smart Shuffle keeps adding unwanted recommended songs into my downloaded offline playlist.",
            "@SpotifyCares Album artwork for downloaded offline tracks is missing and shows blank grey square icons.",
            "@SpotifyCares Why do my downloaded podcasts automatically delete themselves after listening to them?",
            "@SpotifyCares Spotify says 'Storage is full' error even though my SD card has {sd_free}GB of free space."
        ],
        "agent_templates": [
            "@{user} Hey! Remember to go online with Spotify at least once every 30 days to keep your offline downloads active. -{agent}",
            "@{user} Hi! Check Settings > Storage > Storage location, and select your SD Card. Ensure app permissions allow storage access. -{agent}",
            "@{user} Hello! Try toggling 'Download over cellular' in Settings > Audio Quality, or restart your WiFi connection. -{agent}",
            "@{user} Hi! Premium allows downloading up to 10,000 tracks per device on up to 5 different devices! -{agent}",
            "@{user} Hey! Go to Settings > Storage > Clear Cache. This clears cached data without removing your downloaded music tracks. -{agent}",
            "@{user} Hi! Make sure both devices are connected to the exact same WiFi network and Local Files are enabled in Settings. -{agent}",
            "@{user} Hello! You can recover deleted playlists anytime by visiting spotify.com/account/recover-playlists! -{agent}",
            "@{user} Hey! Send us a DM with your device model and app version if offline sync continues to fail: https://spoti.fi/dm -{agent}"
        ]
    },
    "FAMILY_STUDENT_PLAN_ELIGIBILITY": {
        "true_intent": "STUDENT_PLAN_VERIFICATION",
        "customer_templates": [
            "@SpotifyCares Having trouble renewing my Student Discount verification with SheerID. Says university email {student_email} invalid.",
            "@SpotifyCares Family plan invite link says 'Address verification failed, must live at the same address'.",
            "@SpotifyCares My student discount expired yesterday. Can I re-verify my student status for another year?",
            "@SpotifyCares How do I invite members to my Spotify Duo plan for my partner and me?",
            "@SpotifyCares How do I remove an inactive member from our Spotify Family subscription group?",
            "@SpotifyCares Can I upgrade from an Individual plan to Family plan without losing my playlist history and saved tracks?",
            "@SpotifyCares Invitation link for Family plan says 'This invitation link has expired or reached limit'.",
            "@SpotifyCares Spotify Kids app parental controls PIN code was forgotten. How do I reset parent PIN?",
            "@SpotifyCares Can family members on a plan see each other's private listening activity or liked songs?",
            "@SpotifyCares Does the Student plan include free access to Hulu and Showtime subscriptions in {country}?",
            "@SpotifyCares SheerID says my student document was rejected because my name on document doesn't match account name.",
            "@SpotifyCares How many times can a college student renew the 50% off Student Premium discount?",
            "@SpotifyCares Family plan member moved to a new apartment in the same city. Do they get kicked off the plan?",
            "@SpotifyCares High school student asking if high school IDs qualify for Spotify Student discount program.",
            "@SpotifyCares Can I have Spotify Duo if my partner and I live in different postal zip codes?"
        ],
        "agent_templates": [
            "@{user} Hi! Student verification is managed via SheerID. Check document submission guidelines here: https://spoti.fi/student -{agent}",
            "@{user} Hey! All Family plan members must reside at the same physical residential address as the plan manager. -{agent}",
            "@{user} Hello! You can renew your student discount up to 3 times (4 years total). Re-verify at spotify.com/student! -{agent}",
            "@{user} Hi! Log into spotify.com/account, select 'Manage members' under Duo/Family, and copy the new invite link to share. -{agent}",
            "@{user} Hey! As the plan owner, go to spotify.com/account > Family > Manage, click on the member, and select 'Remove'. -{agent}",
            "@{user} Hello! All your saved music, playlists, and listening history remain intact when switching plans! -{agent}",
            "@{user} Hi! The plan manager can generate a fresh invitation link from their Account overview at spotify.com/account. -{agent}",
            "@{user} Hey! Send us a DM with your account username so we can assist with Family/Student verification: https://spoti.fi/dm -{agent}"
        ]
    },
    "FEATURE_REQUESTS_UI": {
        "true_intent": "FEATURE_REQUEST_CATALOG",
        "customer_templates": [
            "@SpotifyCares Feature request: Please allow uploading custom playlist cover art images directly from mobile phone!",
            "@SpotifyCares Why are real-time karaoke lyrics not appearing on the web player and TV app for some tracks?",
            "@SpotifyCares How can I block a specific artist from playing on my Discover Weekly and Release Radar?",
            "@SpotifyCares Please add a feature to swipe right to add songs to queue on Android like iOS has!",
            "@SpotifyCares Please add a native Sleep Timer feature to the {desktop_os} desktop application.",
            "@SpotifyCares When is Spotify HiFi 24-bit lossless streaming audio going to be released?",
            "@SpotifyCares Would love if we could pin our top {pin_count} favorite albums and playlists to the top of our user profile.",
            "@SpotifyCares Can you add collaborative playlist listening sessions with friends over Discord or FaceTime?",
            "@SpotifyCares The Equalizer setting on {desktop_os} desktop app disappeared after the latest update.",
            "@SpotifyCares How do I change my public username or display name on my Spotify artist/user profile?",
            "@SpotifyCares Liked Songs playlist count shows {liked_count} tracks but only {loaded_count} load when scrolling to the bottom.",
            "@SpotifyCares My Daily Mix playlists haven't refreshed for over a week. Same songs on repeat.",
            "@SpotifyCares Please add an option to exclude certain playlists from my Taste Profile and Spotify Wrapped!",
            "@SpotifyCares Can we get a dark mode / light mode toggle switch on the Spotify web and desktop player?",
            "@SpotifyCares Feature suggestion: Allow sorting playlists by BPM / tempo for workout and running mixes."
        ],
        "agent_templates": [
            "@{user} Hey! Great suggestion. You can submit and vote on feature ideas directly on our Spotify Community Idea Board: https://spoti.fi/ideas -{agent}",
            "@{user} Hi! Lyrics availability depends on licensing from Musixmatch and rightsholders. We're constantly adding new lyrics! -{agent}",
            "@{user} Hello! Go to the artist's profile, tap the three dots (···) and select 'Don't play this artist' to block them. -{agent}",
            "@{user} Hi! We're always testing UI improvements. Make sure your app is updated to the latest version on the Play Store! -{agent}",
            "@{user} Hey! Thanks for the feedback! We've passed this request along to our desktop development team. -{agent}",
            "@{user} Hi! You can exclude any playlist from your Taste Profile by tapping the three dots on the playlist and selecting 'Exclude'. -{agent}",
            "@{user} Hello! You can update your display name anytime from your profile page in the mobile or desktop app settings. -{agent}",
            "@{user} Hey! Send us a DM if your Daily Mix or Discover Weekly playlists are stuck so we can refresh your cache! -{agent}"
        ]
    }
}

PARAM_POOLS = {
    "price": ["$9.99", "$10.99", "$14.99", "$16.99", "$19.99", "$12.99", "£9.99", "€10.99"],
    "price_old": ["$9.99", "$12.99", "$14.99"],
    "price_new": ["$10.99", "$14.99", "$16.99", "$17.99"],
    "pay_method1": ["PayPal", "Apple Pay", "Google Play billing", "Visa debit", "Mastercard"],
    "pay_method2": ["Credit Card", "PayPal", "direct debit", "revolving card", "gift card"],
    "inv_num": ["INV-4921", "INV-8832", "INV-1092", "INV-7721", "INV-3304", "INV-6519"],
    "tax_amount": ["3.50", "4.20", "5.00", "6.25", "2.80", "4.99"],
    "card_type": ["Visa debit", "Mastercard", "Amex", "Chase Sapphire", "Wells Fargo Visa"],
    "days": ["3", "5", "7", "10", "14", "30"],
    "gift_val": ["25", "30", "50", "60", "100"],
    "currency": ["EUR", "GBP", "USD", "CAD", "AUD", "INR", "BRL"],
    "net_type": ["4G LTE data", "5G cellular network", "mobile data roaming", "cellular connection"],
    "browser_or_os": ["Chrome web player", "Safari macOS", "Firefox 118", "Edge browser", "Windows 11"],
    "audio_device": ["wired headphones", "AirPods Pro", "Sony WH-1000XM4", "Bose QC45", "car aux cable"],
    "pause_mins": ["2", "3", "5", "10"],
    "mobile_os": ["iOS 15", "iOS 16", "iOS 17", "Android 12", "Android 13", "Android 14"],
    "mobile_device": ["iPhone 13", "iPhone 14 Pro", "Samsung Galaxy S22", "Pixel 7 Pro", "iPad Air", "OnePlus 11"],
    "desktop_os": ["Windows 10", "Windows 11", "macOS Monterey", "macOS Ventura", "macOS Sonoma"],
    "cutoff_secs": ["15", "20", "30", "45"],
    "other_app": ["Instagram", "TikTok", "Google Maps", "Waze", "Camera"],
    "crash_id": ["CR-9921", "CR-4021", "CR-1108", "CR-8732", "CR-5541"],
    "ram_gb": ["2.5", "3.0", "3.8", "4.2", "5.1"],
    "track_count": ["500", "1000", "2500", "5000", "10000"],
    "car_platform": ["Apple CarPlay", "Android Auto", "Tesla Spotify app"],
    "smart_speaker": ["Amazon Echo Dot", "Echo Studio", "Google Nest Mini", "Sonos One", "HomePod mini"],
    "speaker_brand": ["Sonos", "Bose SoundTouch", "JBL Link", "Harman Kardon", "Audio Pro"],
    "tv_brand": ["Samsung Smart TV", "LG webOS TV", "Sony Bravia Android TV", "Roku TV", "Fire TV"],
    "voice_assistant": ["Alexa", "Google Assistant", "Siri voice control"],
    "smart_watch": ["Apple Watch Series 7", "Apple Watch Ultra", "Garmin Forerunner", "Galaxy Watch 5"],
    "game_console": ["PS5", "PlayStation 4", "Xbox Series X", "Xbox One"],
    "streaming_device": ["Roku streaming stick", "Chromecast with Google TV", "Apple TV 4K", "Fire TV Stick 4K"],
    "car_audio_brand": ["Pioneer", "Kenwood", "Alpine", "Sony Car Audio"],
    "sync_code": ["SYNC-401", "SYNC-902", "ERR-771", "WIFI-88"],
    "foreign_country": ["Russia", "Brazil", "Vietnam", "Netherlands", "Turkey", "Nigeria"],
    "home_country": ["Texas, USA", "California, USA", "London, UK", "Toronto, Canada", "Sydney, Australia"],
    "failed_attempts": ["3", "5", "6"],
    "oauth_code": ["400", "401", "500", "INVALID_SESSION"],
    "phone_last4": ["4921", "8823", "1109", "7654", "3321"],
    "user_acc1": ["user_alex99", "sam_music", "jordan_k", "emily_beats"],
    "user_acc2": ["alex_premium", "sam_spotify", "jk_music", "emily_sound"],
    "firewall_code": ["FW-102", "ERR_CONN_BLOCKED", "NET_403"],
    "email_dom": ["Gmail", "Outlook.com", "Yahoo Mail", "iCloud Mail"],
    "download_songs": ["100", "200", "500", "1000", "2500"],
    "storage_gb": ["15", "25", "40", "60", "80"],
    "playlist_size": ["300", "500", "800", "1200", "2000"],
    "sd_free": ["32", "64", "128", "256"],
    "student_email": ["student@stanford.edu", "jdoe@nyu.edu", "alex@utexas.edu", "sarah@ucla.edu", "mike@ox.ac.uk"],
    "country": ["the US", "the UK", "Canada", "Germany", "Australia"],
    "pin_count": ["3", "5", "8"],
    "liked_count": ["1200", "2500", "4000", "7500"],
    "loaded_count": ["800", "1500", "2000", "5000"],
    "app_ver": ["8.8.72", "8.8.84", "8.9.10", "8.9.22"],
    "agent": ["Carlos", "Sarah", "Alex", "Maya", "Liam", "Emma", "Daniel", "Chloe", "Kevin", "Zoe", "Ryan", "Elena"]
}

def generate_scaled_twcs_dataset(conversations_per_intent: int = 135) -> list:
    """
    Generates a rich, scaled Twitter Customer Support dataset for Spotify:
    - 8 intent clusters x conversations_per_intent = 1,000+ clean conversation pairs
    - Non-Spotify noise (Apple, Amazon, Uber, Delta)
    - Deleted, empty, and corrupted tweets
    - Unresolved tweets
    - Duplicate pairs
    """
    random.seed(42)
    rows = []
    base_time = datetime(2017, 11, 1, 8, 0, 0)
    tweet_counter = 10000

    # 1. Generate clean Spotify conversation pairs
    conv_id_counter = 1
    for intent_key, intent_info in INTENT_TEMPLATES.items():
        cust_templates = intent_info["customer_templates"]
        agent_templates = intent_info["agent_templates"]

        for i in range(conversations_per_intent):
            # Pick customer template & fill parameters
            cust_tmpl = random.choice(cust_templates)
            agent_tmpl = random.choice(agent_templates)

            params = {}
            for k, v_list in PARAM_POOLS.items():
                params[k] = random.choice(v_list)

            user_handle = f"user_spot_{conv_id_counter}_{random.randint(100, 999)}"
            params["user"] = user_handle

            # Format customer text
            try:
                cust_text = cust_tmpl.format(**params)
            except KeyError:
                cust_text = cust_tmpl

            # Format agent reply
            try:
                agent_text = agent_tmpl.format(**params)
            except KeyError:
                agent_text = agent_tmpl

            cust_tweet_id = str(tweet_counter)
            agent_tweet_id = str(tweet_counter + 1)
            tweet_counter += 2

            # Compute realistic RFC-2822 timestamps
            t_cust = base_time + timedelta(minutes=conv_id_counter * 14 + random.randint(0, 10))
            t_agent = t_cust + timedelta(minutes=random.randint(4, 25))

            cust_date_str = t_cust.strftime("%a %b %d %H:%M:%S +0000 %Y")
            agent_date_str = t_agent.strftime("%a %b %d %H:%M:%S +0000 %Y")

            # Customer inbound tweet
            rows.append({
                "tweet_id": cust_tweet_id,
                "author_id": user_handle,
                "inbound": "True",
                "created_at": cust_date_str,
                "text": cust_text,
                "response_tweet_id": agent_tweet_id,
                "in_response_to_tweet_id": ""
            })

            # Spotify agent outbound reply
            rows.append({
                "tweet_id": agent_tweet_id,
                "author_id": "SpotifyCares",
                "inbound": "False",
                "created_at": agent_date_str,
                "text": agent_text,
                "response_tweet_id": "",
                "in_response_to_tweet_id": cust_tweet_id
            })

            conv_id_counter += 1

    # 2. Non-Spotify Brand Noise (Should be filtered out)
    non_spotify_brands = [
        ("AppleSupport", "@apple_user Have you tried restarting your iPhone to fix the camera app freeze?"),
        ("AmazonHelp", "@amazon_cust Your Prime delivery package #{inv} has been dispatched and will arrive tomorrow."),
        ("Uber_Support", "@uber_rider We apologize for the trip cancellation fee. We have credited $5 to your Uber wallet."),
        ("Delta", "@delta_flyer Flight DL1842 is scheduled on time for departure from Atlanta Gate B12."),
        ("Nike", "@nike_fan Check out the new Pegasus release on the Nike app with exclusive member discount.")
    ]
    for n_idx, (brand, reply_txt) in enumerate(non_spotify_brands * 30):
        t_id_c = str(tweet_counter)
        t_id_a = str(tweet_counter + 1)
        tweet_counter += 2
        u_h = f"other_user_{n_idx}"
        t_c = base_time + timedelta(hours=n_idx * 2)
        t_a = t_c + timedelta(minutes=15)
        rows.append({
            "tweet_id": t_id_c,
            "author_id": u_h,
            "inbound": "True",
            "created_at": t_c.strftime("%a %b %d %H:%M:%S +0000 %Y"),
            "text": f"@{brand} need help with my service issue #{n_idx + 100}",
            "response_tweet_id": t_id_a,
            "in_response_to_tweet_id": ""
        })
        rows.append({
            "tweet_id": t_id_a,
            "author_id": brand,
            "inbound": "False",
            "created_at": t_a.strftime("%a %b %d %H:%M:%S +0000 %Y"),
            "text": reply_txt.replace("{inv}", str(n_idx + 100)),
            "response_tweet_id": "",
            "in_response_to_tweet_id": t_id_c
        })

    # 3. Deleted / Empty / Corrupted Tweets (Should be filtered out)
    deleted_samples = ["[deleted]", "deleted", "nan", "null", "none", "", "   ", "x"]
    for d_idx, d_text in enumerate(deleted_samples * 6):
        d_id = str(tweet_counter)
        tweet_counter += 1
        rows.append({
            "tweet_id": d_id,
            "author_id": f"deleted_user_{d_idx}",
            "inbound": "True",
            "created_at": (base_time + timedelta(hours=d_idx)).strftime("%a %b %d %H:%M:%S +0000 %Y"),
            "text": d_text,
            "response_tweet_id": "",
            "in_response_to_tweet_id": ""
        })

    # 4. Unresolved Spotify Inquiries (Should be filtered out)
    unresolved_questions = [
        "@SpotifyCares Hello, is Spotify service experiencing an outage in London right now?",
        "@SpotifyCares Anyone else having high battery drain on Android 13 after the latest update?",
        "@SpotifyCares Can I play Spotify music on my smart refrigerator?",
        "@SpotifyCares What is the difference between individual premium and student premium?",
        "@SpotifyCares How do I submit my independent band's demo music to editorial Spotify playlists?",
        "@SpotifyCares What happened to the old desktop green play buttons from 2015?"
    ]
    for u_idx, u_text in enumerate(unresolved_questions * 8):
        u_id = str(tweet_counter)
        tweet_counter += 1
        rows.append({
            "tweet_id": u_id,
            "author_id": f"unresolved_user_{u_idx}",
            "inbound": "True",
            "created_at": (base_time + timedelta(hours=u_idx + 5)).strftime("%a %b %d %H:%M:%S +0000 %Y"),
            "text": u_text,
            "response_tweet_id": "",
            "in_response_to_tweet_id": ""
        })

    # 5. Duplicate Conversations (Should be deduplicated)
    if len(rows) >= 2:
        dup_c = dict(rows[0])
        dup_c["tweet_id"] = str(tweet_counter)
        dup_a = dict(rows[1])
        dup_a["tweet_id"] = str(tweet_counter + 1)
        dup_c["response_tweet_id"] = dup_a["tweet_id"]
        dup_a["in_response_to_tweet_id"] = dup_c["tweet_id"]
        tweet_counter += 2
        rows.append(dup_c)
        rows.append(dup_a)

    return rows

SAMPLE_TWCS_DATA = generate_scaled_twcs_dataset(conversations_per_intent=135)

def ensure_sample_twcs_file(target_path: str = "backend/data/twcs.csv") -> str:
    """Generates the Kaggle twcs.csv file containing 1,000+ clean Spotify conversations."""
    os.makedirs(os.path.dirname(os.path.abspath(target_path)), exist_ok=True)
    
    data = generate_scaled_twcs_dataset(conversations_per_intent=135)
    fieldnames = ["tweet_id", "author_id", "inbound", "created_at", "text", "response_tweet_id", "in_response_to_tweet_id"]
    with open(target_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for row in data:
            writer.writerow(row)
                
    return target_path
