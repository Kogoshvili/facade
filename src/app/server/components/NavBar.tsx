import { AComponent } from 'app/facade/server'

class NavBar extends AComponent {
    showSubmenu = false

    handleMouseOver() {
        this.showSubmenu = !this.showSubmenu
    }

    static render(this: any) {
        return (
            <div onMouseOver={this.handleMouseOver}>
                <h1>NavBar</h1>
                {this.showSubmenu && <p>Submenu</p>}
            </div>
        )
    }
}

export default NavBar
