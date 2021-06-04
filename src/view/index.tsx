import * as React from 'react'
import * as ReactDOM from 'react-dom'
import Main from "./components/Main"
import "./index.less"

class App extends React.Component {
    render() {
        return (
            <Main />
        )
    }
}

ReactDOM.render(<App />, document.getElementById('root'))