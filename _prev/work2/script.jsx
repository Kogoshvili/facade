function Test() {
    const handleClick = () => console.log('hello');
    return <div onClick={() => handleClick}/>
}
