function Header({ name }: { name: string }) {
    return (
        <head>
            <title>{name}</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <link href="https://cdn.jsdelivr.net/npm/@splidejs/splide@4.1.4/dist/css/splide.min.css" rel="stylesheet"></link>
            <script async src="./static/client.js" type="text/javascript"></script>
        </head>
    )
}

export default Header
