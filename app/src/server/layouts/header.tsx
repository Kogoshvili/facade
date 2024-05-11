import { Header as BaseHeader } from 'facade/server'

function Header({ name }: { name: string }) {
    return (
        <BaseHeader>
            <title>{name}</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <link href="https://cdn.jsdelivr.net/npm/@splidejs/splide@4.1.4/dist/css/splide.min.css" rel="stylesheet"></link>
        </BaseHeader>
    )
}

export default Header
