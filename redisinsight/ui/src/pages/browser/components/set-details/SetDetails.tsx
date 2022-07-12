import React, { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import cx from 'classnames'
import {
  EuiProgress,
  EuiText,
  EuiToolTip,
} from '@elastic/eui'
import { CellMeasurerCache } from 'react-virtualized'

import { createDeleteFieldHeader, createDeleteFieldMessage, formatLongName } from 'uiSrc/utils'
import { KeyTypes } from 'uiSrc/constants'
import { sendEventTelemetry, TelemetryEvent, getBasedOnViewTypeEvent, getMatchType } from 'uiSrc/telemetry'
import { connectedInstanceSelector } from 'uiSrc/slices/instances/instances'
import { selectedKeyDataSelector, keysSelector } from 'uiSrc/slices/browser/keys'
import {
  deleteSetMembers,
  fetchSetMembers,
  fetchMoreSetMembers,
  setDataSelector,
  setSelector,
} from 'uiSrc/slices/browser/set'
import { SCAN_COUNT_DEFAULT } from 'uiSrc/constants/api'
import HelpTexts from 'uiSrc/constants/help-texts'
import { NoResultsFoundText } from 'uiSrc/constants/texts'
import VirtualTable from 'uiSrc/components/virtual-table'
import PopoverDelete from 'uiSrc/pages/browser/components/popover-delete/PopoverDelete'
import { columnWidth } from 'uiSrc/components/virtual-grid'
import { IColumnSearchState, ITableColumn } from 'uiSrc/components/virtual-table/interfaces'
import { GetSetMembersResponse } from 'apiSrc/modules/browser/dto/set.dto'
import styles from './styles.module.scss'

const suffix = '_set'
const headerHeight = 60
const rowHeight = 43
const footerHeight = 0
const matchAllValue = '*'

const cellCache = new CellMeasurerCache({
  fixedWidth: true,
  minHeight: rowHeight,
})

export interface Props {
  isFooterOpen: boolean
}

const SetDetails = (props: Props) => {
  const { isFooterOpen } = props
  const [match, setMatch] = useState('*')
  const [deleting, setDeleting] = useState('')
  const [width, setWidth] = useState(100)

  const { loading } = useSelector(setSelector)
  const { key = '', members, total, nextCursor } = useSelector(setDataSelector)
  const { length = 0 } = useSelector(selectedKeyDataSelector) ?? {}
  const { id: instanceId } = useSelector(connectedInstanceSelector)
  const { viewType } = useSelector(keysSelector)

  const dispatch = useDispatch()

  const closePopover = () => {
    setDeleting('')
  }

  const showPopover = (member = '') => {
    setDeleting(`${member + suffix}`)
  }

  const onSuccessRemoved = () => {
    sendEventTelemetry({
      event: getBasedOnViewTypeEvent(
        viewType,
        TelemetryEvent.BROWSER_KEY_VALUE_REMOVED,
        TelemetryEvent.TREE_VIEW_KEY_VALUE_REMOVED
      ),
      eventData: {
        databaseId: instanceId,
        keyType: KeyTypes.Set,
        numberOfRemoved: 1,
      }
    })
  }

  const handleDeleteMember = (member = '') => {
    dispatch(deleteSetMembers(key, [member], onSuccessRemoved))
    closePopover()
  }

  const handleRemoveIconClick = () => {
    sendEventTelemetry({
      event: getBasedOnViewTypeEvent(
        viewType,
        TelemetryEvent.BROWSER_KEY_VALUE_REMOVE_CLICKED,
        TelemetryEvent.TREE_VIEW_KEY_VALUE_REMOVE_CLICKED
      ),
      eventData: {
        databaseId: instanceId,
        keyType: KeyTypes.Set
      }
    })
  }

  const handleSearch = (search: IColumnSearchState[]) => {
    const fieldColumn = search.find((column) => column.id === 'name')
    if (!fieldColumn) { return }

    const { value: match } = fieldColumn
    const onSuccess = (data: GetSetMembersResponse) => {
      const matchValue = getMatchType(match)
      sendEventTelemetry({
        event: getBasedOnViewTypeEvent(
          viewType,
          TelemetryEvent.BROWSER_KEY_VALUE_FILTERED,
          TelemetryEvent.TREE_VIEW_KEY_VALUE_FILTERED
        ),
        eventData: {
          databaseId: instanceId,
          keyType: KeyTypes.Set,
          match: matchValue,
          length: data.total,
        }
      })
    }
    setMatch(match)
    dispatch(fetchSetMembers(key, 0, SCAN_COUNT_DEFAULT, match || matchAllValue, true, onSuccess))
  }

  const columns:ITableColumn[] = [
    {
      id: 'name',
      label: 'Member',
      isSearchable: true,
      staySearchAlwaysOpen: true,
      initialSearchValue: '',
      truncateText: true,
      render: function Name(_name: string, member: string, expanded: boolean = false) {
        // Better to cut the long string, because it could affect virtual scroll performance
        const cellContent = member.substring(0, 200)
        const tooltipContent = formatLongName(member)

        return (
          <EuiText color="subdued" size="s" style={{ maxWidth: '100%', whiteSpace: 'break-spaces' }}>
            <div
              style={{ display: 'flex' }}
              data-testid={`set-member-value-${cellContent}`}
            >
              {!expanded && (
                <EuiToolTip
                  title="Member"
                  className={styles.tooltip}
                  anchorClassName="truncateText"
                  position="left"
                  content={tooltipContent}
                >
                  <>{cellContent}</>
                </EuiToolTip>
              )}
              {expanded && member}
            </div>
          </EuiText>
        )
      },
    },
    {
      id: 'actions',
      label: '',
      relativeWidth: 60,
      minWidth: 60,
      maxWidth: 60,
      headerClassName: 'hidden',
      render: function Actions(_act: any, cellData: string) {
        return (
          <div className="value-table-actions">
            <PopoverDelete
              header={createDeleteFieldHeader(cellData)}
              text={createDeleteFieldMessage(key)}
              item={cellData}
              suffix={suffix}
              deleting={deleting}
              closePopover={closePopover}
              updateLoading={false}
              showPopover={showPopover}
              handleDeleteItem={handleDeleteMember}
              handleButtonClick={handleRemoveIconClick}
              testid={`set-remove-btn-${cellData}`}
              appendInfo={length === 1 ? HelpTexts.REMOVE_LAST_ELEMENT('Member') : null}
            />
          </div>
        )
      },
    },
  ]

  const loadMoreItems = () => {
    if (nextCursor !== 0) {
      dispatch(
        fetchMoreSetMembers(key, nextCursor, SCAN_COUNT_DEFAULT, match || matchAllValue)
      )
    }
  }

  return (
    <div
      className={
        cx(
          'key-details-table',
          'set-members-container',
          styles.container,
          { footerOpened: isFooterOpen }
        )
      }
    >
      {loading && (
        <EuiProgress
          color="primary"
          size="xs"
          position="absolute"
          data-testid="progress-key-set"
        />
      )}

      <VirtualTable
        hideProgress
        expandable
        selectable={false}
        keyName={key}
        headerHeight={headerHeight}
        rowHeight={rowHeight}
        footerHeight={footerHeight}
        loadMoreItems={loadMoreItems}
        loading={loading}
        items={members}
        totalItemsCount={total}
        noItemsMessage={NoResultsFoundText}
        onWheel={closePopover}
        onSearch={handleSearch}
        columns={columns.map((column, i, arr) => ({
          ...column,
          width: columnWidth(i, width, arr)
        }))}
        onChangeWidth={setWidth}
        cellCache={cellCache}
      />

    </div>
  )
}

export default SetDetails
