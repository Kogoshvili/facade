export function getElement(instance: any) {
    return document.getElementById(`${instance._name}.${instance._id}`) ?? null
}
