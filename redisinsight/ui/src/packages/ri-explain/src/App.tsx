import React from 'react'
import Explain from './Explain'

const isDarkTheme = document.body.classList.contains('theme_DARK')

export function App(props: { command?: string, data: any }) {

  const ErrorResponse = HandleError(props)

  if (ErrorResponse !== null) return ErrorResponse

  return (
    <div id="mainApp" style={{ height: "100%", width: '100%', overflowX: 'auto' }}>
      <Explain command={props.command || ''} data={props.data}/>
    </div>
  )
}

function HandleError(props: { command?: string, data: any }): JSX.Element  | null {
  const { data: [{ response = '', status = '' } = {}] = [] } = props

  if (status === 'fail') {
    return <div className="responseFail">{JSON.stringify(response)}</div>
  }

  return null
}
