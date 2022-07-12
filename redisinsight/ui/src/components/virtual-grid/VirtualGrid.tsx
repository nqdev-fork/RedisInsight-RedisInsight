import React, { useCallback, useEffect, useRef, useState } from 'react'
import cx from 'classnames'
import AutoSizer, { Size } from 'react-virtualized-auto-sizer'
import { isObject, xor } from 'lodash'
import { EuiProgress, EuiIcon, EuiText } from '@elastic/eui'
import InfiniteLoader from 'react-window-infinite-loader'
import { VariableSizeGrid as Grid, GridChildComponentProps } from 'react-window'

import { Maybe } from 'uiSrc/utils'
import { SortOrder } from 'uiSrc/constants'
import { SCAN_COUNT_DEFAULT } from 'uiSrc/constants/api'
import { IProps } from './interfaces'
import { columnWidth, useInnerElementType } from './utils'

import styles from './styles.module.scss'

const loadingMsg = 'loading...'
let selectTimer: number = 0
const selectTimerDelay = 300
let preventSelect = false

const VirtualGrid = (props: IProps) => {
  const {
    rowHeight = 40,
    totalItemsCount = 0,
    onChangeSorting = () => {},
    sortedColumn = null,
    noItemsMessage = 'No items to display.',
    loading,
    columns = [],
    items = [],
    onWheel,
    keyName,
    loadMoreItems,
    setScrollTopPosition = () => {},
    scrollTopProp = 0,
    maxTableWidth = 0,
    hideProgress,
  } = props

  const scrollTopRef = useRef<number>(0)
  const [width, setWidth] = useState<number>(100)
  const [height, setHeight] = useState<number>(100)
  const [forceScrollTop, setForceScrollTop] = useState<Maybe<number>>(scrollTopProp)

  const [expandedRows, setExpandedRows] = useState<number[]>([])

  const gridRef = useRef()
  const sizeMap = useRef({})
  const setSize = useCallback((index, size) => {
    sizeMap.current = { ...sizeMap.current, [index]: size }

    gridRef.current?._listRef?.resetAfterRowIndex?.(index)
  }, [])
  const getSize = (index) =>
    sizeMap.current[index] || rowHeight

  useEffect(() =>
    () => {
      setScrollTopPosition(scrollTopRef.current)
      setExpandedRows([])
    }, [])

  useEffect(() => {
    if (forceScrollTop !== undefined) {
      setForceScrollTop(undefined)
    }
  }, [forceScrollTop])

  const onScroll = useCallback(
    ({ scrollTop }) => {
      scrollTopRef.current = scrollTop
    },
    [scrollTopRef],
  )

  const changeSorting = (column: any) => {
    if (!sortedColumn || !sortedColumn.column || sortedColumn.column !== column) {
      onChangeSorting(column, SortOrder.DESC)
      return
    }
    onChangeSorting(column, sortedColumn.order === SortOrder.DESC ? SortOrder.ASC : SortOrder.DESC)
  }

  const loadMoreRows = async (startIndex:number, stopIndex:number): Promise<any> => {
    // We do not load more results for first load
    if (forceScrollTop !== undefined) return

    if (!loading) {
      loadMoreItems?.({ keyName, startIndex, stopIndex })
    }
  }

  const onResize = ({ height, width }: Size): void => {
    setHeight(height)
    setWidth(width)
  }

  const onRowClick = (event: MouseEvent, rowIndex: number) => {
    selectTimer = window.setTimeout(() => {
      const textSelected = window.getSelection()?.toString()
      if (!preventSelect && !textSelected) {
        setExpandedRows(xor(expandedRows, [rowIndex]))
      }
      preventSelect = false
    }, selectTimerDelay)

    if (event?.detail === 3) {
      clearSelectTimeout(selectTimer)
      preventSelect = false
    }
  }

  const clearSelectTimeout = (timer: number = 0) => {
    clearTimeout(timer || selectTimer)
    preventSelect = true
  }

  const Cell = ({ columnIndex, rowIndex, style, expandedRows = [] }: GridChildComponentProps<null>) => {
    const rowData = items[rowIndex]
    const column = columns[columnIndex]
    const content: any = rowData?.[column?.id] || ''
    const cellRef = useRef()

    const expanded = expandedRows.indexOf(rowIndex) !== -1

    React.useEffect(() => {
      const paddingSize = 24
      const cellHeight = cellRef.current?.children?.[0]?.getBoundingClientRect?.().height + paddingSize

      if ((!getSize(rowIndex) && rowIndex !== 0)) {
        setSize(rowIndex, cellHeight)
      }
    }, [setSize, rowIndex, expanded])

    if (rowIndex === 0) {
      return (
        <div ref={cellRef} style={style}>
          <div className={cx(styles.gridHeaderItem, 'truncateText')}>
            {isObject(content) && (
              <>
                {!!content?.sortable && (
                  <button
                    type="button"
                    data-testid="header-sorting-button"
                    className={styles.gridHeaderItemSortable}
                    onClick={() => changeSorting(column.id)}
                  >
                    <span>{content.label}</span>
                    <span style={{ paddingLeft: 0 }}>
                      <EuiIcon
                        style={{ marginLeft: '4px' }}
                        type={sortedColumn?.order === SortOrder.DESC ? 'sortDown' : 'sortUp'}
                      />
                    </span>
                  </button>
                )}
                {!content?.sortable && (<div>{content.label}</div>)}
              </>
            )}
            {!isObject(content) && content}
            {!isObject(content) && !content && <div>&nbsp;</div> }
          </div>
        </div>
      )
    }
    if (columnIndex === 0) {
      const lastColumn = columns[columns.length - 1]
      const allDynamicRowsHeight: number[] = Object.values(sizeMap.current)
      const allRowsHeight = allDynamicRowsHeight.reduce((a, b) => a + b, 0)
       + (items.length - allDynamicRowsHeight.length) * rowHeight

      const hasHorizontalScrollOffset = height < allRowsHeight

      return (
        <div
          style={style}
          ref={cellRef}
          className={cx(styles.gridItem,
            rowIndex % 2
              ? styles.gridItemOdd
              : styles.gridItemEven)}
        >
          {column?.render && isObject(rowData) && column?.render(rowData, expanded) }
          {!column?.render && content }

          <div
            className={cx(styles.gridItem, styles.gridItemLast,
              rowIndex % 2
                ? styles.gridItemOdd
                : styles.gridItemEven)}
            style={{
              width: lastColumn?.minWidth,
              height: getSize(rowIndex),
              marginLeft: width - lastColumn?.minWidth - (hasHorizontalScrollOffset ? 29 : 13)
            }}
          >
            {lastColumn?.render && isObject(rowData) && lastColumn?.render(rowData, expanded) }
          </div>
        </div>
      )
    }

    return (
      <div
        ref={cellRef}
        style={style}
        className={cx(styles.gridItem,
          rowIndex % 2
            ? styles.gridItemOdd
            : styles.gridItemEven)}
      >
        {column?.render && isObject(rowData) && column?.render(rowData, expanded) }
        {!column?.render && content }
      </div>
    )
  }

  const innerElementType = useInnerElementType(
    Cell,
    (i) => columnWidth(i, width, columns),
    getSize,
    columns.length - 1,
    width,
  )

  return (
    <div
      className={styles.container}
      onWheel={onWheel}
      data-testid="virtual-grid-container"
    >
      {(loading && !hideProgress) && (
        <EuiProgress
          color="primary"
          size="xs"
          position="absolute"
          className={styles.progress}
          data-testid="progress-entry-list"
        />
      )}
      {items.length > 1 && (
        <AutoSizer onResize={onResize}>
          {() => (
            <InfiniteLoader
              ref={gridRef}
              isItemLoaded={(index) => index < items.length}
              loadMoreItems={loadMoreRows}
              minimumBatchSize={SCAN_COUNT_DEFAULT}
              threshold={100}
              itemCount={totalItemsCount}
            >
              {({ onItemsRendered, ref }) => (
                <Grid
                  ref={ref}
                  onItemsRendered={(props) =>
                    onItemsRendered({
                      visibleStartIndex: props.visibleRowStartIndex || 0,
                      visibleStopIndex: props.visibleRowStopIndex || 0,
                      overscanStartIndex: props.overscanRowStartIndex || 0,
                      overscanStopIndex: props.overscanRowStopIndex || 0,
                    })}
                  className={styles.grid}
                  columnCount={columns.length}
                  columnWidth={(i) => columnWidth(i, width, columns)}
                  height={height}
                  rowCount={items.length}
                  rowHeight={getSize}
                  width={width}
                  innerElementType={innerElementType}
                  onScroll={onScroll}
                  initialScrollTop={forceScrollTop}
                  itemData={items}
                >
                  {({ data, rowIndex, columnIndex, style }) => (
                    <div onClick={(e) => onRowClick(e, rowIndex)} role="presentation">
                      <Cell
                        style={style}
                        data={data}
                        columnIndex={columnIndex}
                        rowIndex={rowIndex}
                        expandedRows={expandedRows}
                      />
                    </div>
                  )}
                </Grid>
              )}
            </InfiniteLoader>
          )}
        </AutoSizer>
      )}
      {items.length === 1 && (<EuiText className={styles.noItems} color="subdued">{loading ? loadingMsg : noItemsMessage}</EuiText>)}
    </div>
  )
}

export default VirtualGrid
