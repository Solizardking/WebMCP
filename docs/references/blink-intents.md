![Sam Dutton](https://web.dev/images/authors/samdutton.jpg) Sam Dutton [X](https://twitter.com/sw12) [GitHub](https://github.com/samdutton) [Mastodon](https://techhub.social/@samdutton) [Bluesky](https://bsky.app/profile/samdutton.bsky.social) [Homepage](https://samdutton.com)

<br />

When engineers want to make a change to the
[Blink rendering engine](https://developer.chrome.com/docs/web-platform/blink), they post on the
[blink-dev mailing list](https://groups.google.com/a/chromium.org/g/blink-dev)
to get approval to proceed. These mailing list posts are called *Blink Intents*.

[Video](https://www.youtube.com/watch?v=9cvzZ5J_DTg)

[Chromium](https://developer.chrome.com/docs/web-platform/chrome-chromium)-based web browsers use
the [Blink rendering engine](https://developer.chrome.com/docs/web-platform/blink) to transform code and
resources into web pages you can view and interact with.
![](https://developer.chrome.com/static/docs/web-platform/blink-intents/images/blink-dev.png) The [blink-dev mailing list](https://groups.google.com/a/chromium.org/g/blink-dev).

Discover how Blink Intents work, why they're important, and how new features
make their way into Blink.

## Chromium and Blink

[Chromium](https://www.chromium.org/) is the open-source browser project on
which Chrome and some other browsers and frameworks are built. Blink is the
rendering engine used by Chromium.

> [!IMPORTANT]
> **Key Term:** A *rendering engine* is the component of a web browser that transforms HTML, CSS and JavaScript---along with images and other resources---into interactive web pages. Read [What is Blink](https://developer.chrome.com/docs/web-platform/blink) for more detail on this process.

For a new feature to land in Blink, it needs to go through the Chromium
project's open development process. A "new feature" is any change or addition to
browser code or architecture. That could be a new JavaScript API, a significant
performance enhancement in Blink code, or some other change, to the way the
browser looks or functions.

## An open and collaborative process

Chromium is a huge, complex project with thousands of contributors. When there
are changes to Chromium, each milestone is an opportunity to invite the wider
web ecosystem to comment on design and implementation.

Wherever possible, new features must be interoperable across the web platform,
and not implemented solely on one browser. Web developers don't want surprises:
when browsers don't work the way you expect---or when you wind up having to write
different code for different browsers and platforms. Blink Intents help
structure and regulate the process of change, to make changes more predictable,
and less of a surprise, which is good for web developers.

For users, browser vendors need to be careful that changes don't cause websites
to stop working. Site owners quite often stop maintaining websites. Some sites
haven't been updated in decades! Browser vendors need to consider this when
making changes that might cause breakage.

## From idea to proposal

Proposals for changes and updates to the web platform come out of
research: consulting with users, businesses, browser engineers, web developers
and other stakeholders. This research allows the Chrome team to work out what's
missing from the platform, or what needs to change.
Initially, a proposal for a change or a new feature on the web platform is just
words on a page. Engineers share documents, for feedback and discussion from
their colleagues.

### An example: FedCM

![](https://developer.chrome.com/static/docs/web-platform/blink-intents/images/fedcm-explainer.png) The [FedCM explainer on GitHub](https://github.com/w3c-fedid/FedCM).

[Federated Credential Management](https://developer.chrome.com/docs/identity/fedcm/overview) (FedCM) is
an API that offers a privacy-centric and user-friendly approach to user signup
and login, known as federated identity. For example, this applies to
[Sign in with Google](https://www.google.com/account/about/sign-in-with-google/)
and other social sign ins.

To create a browser API, the first step is to ready a proposal for public
discussion. FedCM's proposal was published on GitHub as an *explainer*. Everyone
is invited to ask questions or comment on the feature designs, by creating a
GitHub Issue on the explainer repository. Feedback may include developer
descriptions of additional use cases, constraints, ideas for improvement, or
a vow of support.

Once a proposal is adopted by a standardization body, such as the
[W3C](https://www.w3.org/), stakeholders can join discussions and watch
presentations in web standards groups, such as the [W3C Working
Groups](https://www.w3.org/groups/wg/).

> [!IMPORTANT]
> **Important:** Some feature proposals never pass the initial draft stage. Sometimes, a feature makes it to the experimental phase, where developers test it with users, but then the feature is completely reworked as the testing surfaced unexpected issues. Features must demonstrate that they meet stakeholder needs, making the web better for users, before the feature is added across browsers as a part of the web platform.

## Blink Intents: Milestones and progress

For each milestone when engineers are working on a new feature or a change to
the Blink rendering engine, they publish a post on the
[blink-dev discussion group](https://groups.google.com/a/chromium.org/g/blink-dev),
explaining that they intend to move to the next phase towards implementation of
a feature. These posts are called "intents".
Anyone can subscribe to the blink-dev group, to get notified when there's
progress with new features in Blink, or subscribe to an individual feature for
updates.

### Intent to Prototype

At this point, Chromium engineers can begin to implement a feature. This means
that prototype functionality for the feature may be made available for developer
testing behind a [feature
flag](https://developer.chrome.com/docs/web-platform/chrome-flags), initially in
Chrome Canary, and then in other release channels. Any user can set a flag from
the chrome://flags page to activate and test a feature in their browser.

However, not all flags can be set from the chrome://flags page. For more
fine-grained control, you can run Chrome from a terminal, using command-line
flags. Bear in mind that some new features are not available until the feature
ships for testing in Chrome Canary---though this is quite rare. Some features
don't have their own flag, but they're made available if the
[experimental-web-platform-features](https://developer.chrome.com/docs/web-platform/chrome-flags#two_other_ways_to_try_out_experimental_features)
flag is enabled. This is generally the case for "smaller" features that take no
more than three to six months to implement, at the most.

#### Gathering feedback on prototypes

Once prototyping of a new feature has begun, Chromium engineers invite
discussion and early experimentation. Feedback at this point is critical for
validating and iterating on proposals. [Chromium bugs](https://crbug.com/new) is the
place to comment on the implementation in Chrome.
![](https://developer.chrome.com/static/docs/web-platform/blink-intents/images/chromium-issue.png) Create an issue in the [Chromium Issue Tracker](https://crbug.com/new).

### Intent to Experiment: Testing in the real world

An Intent to Experiment post on blink-dev is an optional next step, if Chrome
engineers want to request to run an [origin trial](https://developer.chrome.com/docs/web-platform/origin-trials).
![](https://developer.chrome.com/static/docs/web-platform/blink-intents/images/fedcm-i2e.png) [Intent to Experiment for FedCM](https://groups.google.com/a/chromium.org/g/blink-dev/c/kws-gltC5us).

Origin trials are a way to test a new or experimental web platform feature. You
register for the origin trial of a feature, then get a token for the trial. The
feature will be activated on any page that provides the token.
![](https://developer.chrome.com/static/docs/web-platform/blink-intents/images/chrome-origin-trials.png) A list of available [Chrome Origin Trials]().

#### Approval from Blink API owners

For progress towards implementation of a feature to proceed, the [Blink API
owners](https://www.chromium.org/blink/guidelines/api-owners/) must give their
approval by replying to an intent with a "looks good to me" post, known as an
LGTM.

The Blink API Owners are a small group of Chromium contributors, highly
experienced with the web platform and its APIs, and agreed by the Blink
community to be in good standing, with a commitment to Blink's mission and
values. As well as giving approval (or not!) for features to proceed towards
implementation, the API Owners oversee the Blink Intent process itself.

An Intent to Experiment must get at least one LGTM from API owners.
![](https://developer.chrome.com/static/docs/web-platform/blink-intents/images/i2e-lgtms.png) LGTMs on [FedCM Intent to Experiment post](https://groups.google.com/a/chromium.org/g/blink-dev/c/kws-gltC5us).

#### The value of origin trials

Developers can sign up for the origin trial of a feature, and then test the
feature in production in real-world environments, with real users---without users
needing to take action for the feature to be activated. Developers can share the
results of their tests, and that provides valuable insight and data to help
iterate and evolve the feature.

## Intent to Ship: The final milestone

The Intent to Ship signals that a feature is now complete and ready to be
implemented for general availability, for all users in Chrome Stable without
needing a flag or a trial token. An Intent to Ship must get *three* LGTMs from
API owners, before implementation can proceed.

### Rolling out new features

Once approved, a feature is merged into an upcoming release and then progresses
through the [Chrome release channels](https://developer.chrome.com/docs/web-platform/chrome-release-channels).
Testing and implementation of new features is often handled with special care.
Some features are rolled out gradually, to an increasing proportion of users.
Features can be also rolled back and reworked, if there are unexpected side
effects.

> [!IMPORTANT]
> **Key Point:** As a developer or a site owner, it's critical to test your sites with the Canary and Beta versions of Chrome to catch and report any bugs before a feature is stable. Take the [Learn Testing](https://web.dev/learn/testing) course to gain best practices for web testing.

### Manage deprecation and removal

There are two other types of Blink intent:

- Intent to Deprecate
- Intent to Remove

These might sound a bit sad, but they're actually critical to the success of
Blink development.

An **Intent to Deprecate** is posted by engineers when they want to start warning
developers that a feature is scheduled to be deprecated. For example, by
providing support and information about the deprecation in the Chrome DevTools
console.

An **Intent to Remove** is posted when engineers intend for code to be deactivated
by default.
![](https://developer.chrome.com/static/docs/web-platform/blink-intents/images/i2d.png) LGTMs on [Intents to Deprecate on blink.dev](https://groups.google.com/a/chromium.org/g/blink-dev/search?q=%22Intent+to+Deprecate+and+Remove%22).

#### The importance of deprecation and removal

Deprecation and removal are both critical to the health of the web platform.
They make sure Chrome can remove features that don't work well for end users or
web developers---and help reduce the complexity of the codebase. For example,
[problems with the design of AppCache](https://alistapart.com/article/application-cache-is-a-douchebag/)
were discovered once it was used on production sites in stable browsers, and the
API was eventually removed. Deprecations and removals also help to keep Chrome
safe and secure, by reducing potential attack vectors.

Like with all Blink intents, the Chrome team do their best to approach decisions
with care. They review feature usage rates and other data before proceeding. The
bar for removing features is actually incredibly high, and a feature will only
be removed if it's used by a very, very small proportion of users, and if better
alternatives are available.

## Keep up to date with Blink Intents

You can track progress of features on [Chrome Status](https://chromestatus.com/features),
where you can subscribe to updates, file bugs, and find other resources.
![](https://developer.chrome.com/static/docs/web-platform/blink-intents/images/chromestatus.png) Chrome feature roadmap on [chromestatus.com](https://chromestatus.com).

To track new features, follow the
[Chromium Blog](https://blog.chromium.org/search/label/beta) and join the
[blink-dev discussion group](https://groups.google.com/a/chromium.org/g/blink-dev).
The group can result in a *lot* of emails, so you may prefer to
subscribe to a single intent. You can view a
[spreadsheet of Blink intents](https://bit.ly/blinkintents).

If you *really* like Blink Intents, you can even build on the
[automated Blink Intent Tracker services](https://github.com/chromium/blink-intent-tracker).

## Next steps

Check out [What are Chrome release channels?](https://developer.chrome.com/docs/web-platform/chrome-release-channels).