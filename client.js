window.smol = window.smol || {};

smol.onClick = function(e, path) {
    const parent = e.target.closest('[smol]');

    if (parent) {
        parent.smol = parent.smol ?? {};
        parent.smol.state = parent.smol.state ?? {};
        // get state from smol-state attribute
        const state = JSON.parse(parent.getAttribute('smol-state'));
        parent.smol.state = state;
    }

    const [component, method] = path.split('.'); // ['ChildComponent', 'onClick'
    // make request to server
    fetch(`http://localhost:3000/component?component=${component}&method=${method}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(parent.smol.state)
    })
    .then(res => res.text())
    .then(html => {
        console.log(html);
        // find closest parent with smol attribute
        // replace parent with new html
        parent.outerHTML = html;
    });
}
