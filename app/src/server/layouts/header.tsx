function Header({ name }: { name: string }) {
    return (
        <head>
            <title>{name}</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <link href="https://cdn.jsdelivr.net/npm/@splidejs/splide@4.1.4/dist/css/splide.min.css" rel="stylesheet"></link>
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
