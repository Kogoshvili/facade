function Header({ children}: { children: any }) {
    return (
        <head>
            { children }
            <script async src="./static/client.js" type="text/javascript"></script>
            <script>
                {`
                    function loaded(name, componentName, componentId){
                        window.loadedModules = window.loadedModules || []

                        if (window.facade && window.facade.loaded) {
                            facade.loaded(name, componentName, componentId)
                        } else {
                            window.loadedModules.push({ name, componentName, componentId })
                        }
                    }
                `}
            </script>
        </head>
    )
}

export default Header
