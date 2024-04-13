import { Component, IComponent } from 'facade/server/Component'
import ModalService from '../services/ModalService'
import { Inject } from 'facade/server/Injection'

@Component()
class Modal implements IComponent{
    content: string | null = null
    // @ts-ignore
    @Inject(ModalService) modalService: ModalService

    // executes every time the component is rendered
    constructor() {}

    // executed every time the component is rendered
    init() {
        this.modalService.modal$.subscribe((data: any) => {
            console.log('Modal data', data)
            this.content = data
        })
    }

    // executed only once
    async mount() {}

    // executed every time the component is rendered
    prerender() {}

    render() {
        return `
            <div>
                {{content.title}}
            </div>
        `
    }
}

export default Modal
