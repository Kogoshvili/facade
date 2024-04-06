window.smol = window.smol || {};

smol.onClick = function(e, path) {
    const isComponent = e.target.hasAttribute('smol');
    const component = isComponent ? e.target : e.target.closest('[smol]');

    if (!component.smol) {
        defineSmol(component);
    }

    const [componentName, method] = path.split('.');
    fetch(`http://localhost:3000/smol?component=${componentName}&method=${method}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(component.smol.state)
    })
    .then(res => res.text())
    .then(html => {
        // component.outerHTML = html;
        smartUpdateElement(component, html);
        const matches = /smol-state='(.+?)'/.exec(html);
        component.smol.state = JSON.parse(matches[1]);
        console.log(component.smol.state);
    });
}

function defineSmol(component) {
    component.smol = component.smol ?? {};
    component.smol.state = component.smol.state ?? {};
    const state = JSON.parse(component.getAttribute('smol-state'));
    component.smol.state = state;
}

function updateElement(oldElement, newHTML) {
    // Parse new HTML into a DOM node
    var tempDiv = document.createElement('div');
    tempDiv.innerHTML = newHTML;
    var newElement = tempDiv.firstChild;

    // Update smol and smol-state attributes
    oldElement.setAttribute('smol', newElement.getAttribute('smol'));
    oldElement.setAttribute('smol-state', newElement.getAttribute('smol-state'));

    // Get children of old and new elements
    var oldChildren = oldElement.children;
    var newChildren = newElement.children;

    // Iterate over children
    for (var i = 0; i < oldChildren.length; i++) {
        // If child elements are not equal, update old child with new child
        if (oldChildren[i].outerHTML !== newChildren[i].outerHTML) {
            oldChildren[i].outerHTML = newChildren[i].outerHTML;
        }
    }
}

function smartUpdateElement(oldElement, newHTML) {
    // Parse new HTML into a DOM node
    var tempDiv = document.createElement('div');
    tempDiv.innerHTML = newHTML;
    var newElement = tempDiv.firstChild;

    // If the new element is significantly different from the old one, replace the entire element
    if (isSignificantlyDifferent(oldElement, newElement)) {
        oldElement.outerHTML = newHTML;
        console.log('replaced');
    } else {
        // Otherwise, update only the differences
        updateElement(oldElement, newHTML);
        console.log('updated');
    }
}

function isSignificantlyDifferent(oldElement, newElement) {
    // This is a placeholder. You'll need to replace this with your own logic.
    // For example, you might compare the number of children, the types of elements,
    // the attributes, etc.
    return oldElement.outerHTML.length / newElement.outerHTML.length > 1.2 || newElement.outerHTML.length / oldElement.outerHTML.length > 1.2;
}

