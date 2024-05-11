function Link({ href, children, ...attrs }: any)
{
    return (
        <a href={`javascript:facade.link('${href}')`} {...attrs}>{children}</a>
    )
}

export default Link
