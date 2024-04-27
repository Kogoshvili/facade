function Header({ name }: { name: string }) {
    return (
        <head>
            <title>{name}</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <script async src="./static/facade.js" type="text/javascript"></script>
            <script async src="./static/client.js" type="text/javascript"></script>
        </head>
    )
}

export default Header
