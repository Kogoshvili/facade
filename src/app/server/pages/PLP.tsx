import Header from 'server/layouts/header'
import Body from 'server/layouts/body'
import ProductList from 'server/components/ProductList.facade'
import Filter from 'server/components/Filter.facade'
import NavBar from 'server/components/NavBar.facade'


function PLP(req) {
    return (
        <html>
            <Header name="Shop - PLP" />
            <Body>
                <NavBar />
                <div class="flex flex-row justify-between gap-5">
                    <div class="basis-1/6 bg-gray-100 drop-shadow-lg">
                        <Filter />
                    </div>
                    <div class="basis-5/6">
                        <ProductList cols={3} query={req.query} />
                    </div>
                </div>
            </Body>
        </html>
    )
}

export default PLP

