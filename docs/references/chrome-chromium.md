# Chrome and Chromium

![Sam Dutton](https://web.dev/images/authors/samdutton.jpg) **Sam Dutton** · [X](https://twitter.com/sw12) · [GitHub](https://github.com/samdutton) · [Mastodon](https://techhub.social/@samdutton) · [Bluesky](https://bsky.app/profile/samdutton.bsky.social) · [Homepage](https://samdutton.com)

Source: [Chrome and Chromium — Chrome for Developers](https://developer.chrome.com/docs/web-platform/chrome-chromium). The following excerpt was supplied by the user; Markdown escaping has been normalized for readability.

Chrome is built on [Chromium](https://www.chromium.org/), an open-source web browser project. You can [download and run Chromium](https://www.chromium.org/getting-involved/download-chromium/) as a standalone browser.

Chrome adds some important features on top of Chromium.

For example:

- Chrome adds proprietary software for decoding audio and video files, known as codecs.
- Chrome can report errors to its engineering team if the user permits.
- Chrome provides a number of user-agent features such as password management, shared history, bookmarks and more, using your Google Account.
- Chrome downloads updates automatically.
- Chrome implements Chrome DevTools for testing, debugging and experimenting right in the browser.

Chrome also goes through rigorous additional testing processes through its [release channels](https://developer.chrome.com/docs/web-platform/chrome-release-channels). This includes Chrome Canary, Chrome Dev, Chrome Beta, and Chrome Stable.

To get an idea of just how much effort goes into building a browser, take a look at the `chrome://credits` page. It lists hundreds of technologies and projects used by Chrome.

![The chrome://credits page shows a list of technologies, with links to the feature code and websites.](https://developer.chrome.com/static/docs/web-platform/chrome-chromium/images/chrome-credits.png)

The `chrome://credits` page shows a list of technologies, with links to the feature code and websites.

Check out a graphic representation of how resources are included in Chromium with [Visualizing entire Chromium include graph](https://blog.bkryza.com/posts/visualizing-chromium-include-graph).

## Other browsers and Chromium

Chromium's codebase is used for more than just Google Chrome. The code is the basis of many other browsers, including Microsoft Edge, Samsung Internet, Arc, [Android WebView](https://developer.android.com/develop/ui/views/layout/webapps), Vivaldi, Brave, and Opera.

## Related reading

- [Blink rendering engine — Sam Dutton](blink.md)
- [Blink Intents — Sam Dutton](blink-intents.md)
- [Browser Run reference collection](README.md)
- [Solana workspace integration guide](../solana-browser.md)
