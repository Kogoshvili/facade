# Facade - Server-side frontend framework (WIP, ALPHA)

Facade is a server-side frontend framework, that takes idea of SSR to the extrime by making frontend code run on the server, so that all logic, page rendering, UI changes, and state management is done on the server, and not on the client.

Advantages of this technic are:
 - better SEO, since all content is rendered on the server (same as in SSR)
 - faster page load, since all content is rendered on the server (same as in SSR)
 - low constant bundle size, since code leaves on the server, and no need to send it to the client
 - low cpu and memory usage since all computations are done on the server, and no need to run them on the client
 - complite obfuscation of the frontend code, since it is not sent to the client
 - scalable, since all computations are done on the server, and not on the client, you can scale your server and not be limited by the client's hardware
 - consistency of UX, since all computations are done on the server, and not on the client, you can be sure that all clients, no matter what hardware they have, will have the same experience.
 - no need for Babel, since all code is run on the server, you can use the latest features of JS without the need to transpile it to the older versions.
 - no hydration, framework uses inline events, so when page loads, it is already interactive.

* Facade has optional client side components and functions, that can be used to enhance the user experience, but they are not required for the core functionality of the framework. They are designed to allow functionality that execution on client-side, like sliders, carousels, etc.

How it works:
1. Pages is rendered on the server, and sent to the client
2. Client side facade code loads and makes connection to the server using WebSocket or HTTP.
3. When user interacts with the page, client side facade code sends events to the server.
4. Component on the server is triggered by the event, if there are UI or State changes, server sends diff object describing the changes to the client.
5. Client side facade code applies the changes to the page.

# Demo
URL: http://164.90.235.40/

To demonstate different approaches when working with Facade:
Switching between home and product list pages is done in SPA style.
Switching to product details page is done in MPA style.
Search suggestion modal is done using client side component.
Cart modal is done using server side component.

# Setup
npm i -g @kogoshvili/facade-make
@kogoshvili/facade-make ./my-app
