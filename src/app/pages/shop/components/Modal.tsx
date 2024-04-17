import { AComponent, Component, Inject, effect } from 'facade/server'
import ModalService from '../services/ModalService'

@Component()
class Modal extends AComponent<any> {
    content: any | null = null
    modalService = Inject<ModalService>(ModalService, { read: true })

    // don't put effect here, stack overflow
    // executes every time the component is rendered
    constructor(props: any) {
        super(props)
    }

    // Place for effects
    // executed every time the component is rendered
    init() {
        effect(
            () => this.content = this.modalService.modal(),
            [this.modalService.modal]
        )
    }

    // executed only once
    async mount() {}

    // executed every time the component is rendered
    prerender() {}

    onClose() {
        this.modalService.closeModal()
    }

    static render(this: Modal) {
        if (!this.content) return null

        return (
            <div class="fixed z-10 inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                    <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"></div>
                    <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                        <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                            <div class="sm:flex sm:items-start">
                                <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                                    <h3 class="text-lg leading-6 font-medium text-gray-900" id="modal-title" height="100">
                                        {this.content.title}
                                    </h3>
                                    <div class="mt-2">
                                        <img class="w-full" src={this.content.image} alt={this.content.title} />
                                        <p class="text-sm text-gray-500">
                                            {this.content.description}
                                        </p>
                                    </div>
                                    <button onClick={this.onClose} type="button" class="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm">Close</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }
}

export default Modal
