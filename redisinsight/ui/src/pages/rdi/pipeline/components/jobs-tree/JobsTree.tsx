import {
  EuiAccordion,
  EuiButtonIcon,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingSpinner,
  EuiText,
  EuiTextColor,
  EuiToolTip
} from '@elastic/eui'
import cx from 'classnames'
import { useFormikContext } from 'formik'
import React, { useState } from 'react'
import { useSelector } from 'react-redux'

import InlineItemEditor from 'uiSrc/components/inline-item-editor'
import { PageNames } from 'uiSrc/constants'
import ConfirmationPopover from 'uiSrc/pages/rdi/components/confirmation-popover/ConfirmationPopover'
import { IPipeline, IRdiPipelineJob } from 'uiSrc/slices/interfaces'
import { rdiPipelineSelector } from 'uiSrc/slices/rdi/pipeline'
import { TelemetryEvent, sendEventTelemetry } from 'uiSrc/telemetry'
import { Nullable } from 'uiSrc/utils'

import styles from './styles.module.scss'

export interface IProps {
  onSelectedTab: (id: string) => void
  path: string
}

const validateJobName = (jobName: Nullable<string>, jobIndex: Nullable<number>, jobs: IRdiPipelineJob[]) => {
  const currentJobName = jobs[jobIndex ?? 0]?.name

  if (!jobName) {
    return { title: '', text: 'job name is required' }
  }

  if (jobs.filter((job) => job.name !== currentJobName).some((job) => job.name === jobName)) {
    return { title: '', text: 'job name is already in use' }
  }

  return undefined
}

const JobsTree = (props: IProps) => {
  const { onSelectedTab, path } = props

  const [isExpanded, setIsExpanded] = useState(true)
  const [editJobName, setEditJobName] = useState<Nullable<string>>(null)
  const [editJobIndex, setEditJobIndex] = useState<Nullable<number>>(null)
  const [deleteJobIndex, setDeleteJobIndex] = useState<Nullable<number>>(null)
  const [isNewJob, setIsNewJob] = useState(false)

  const { loading } = useSelector(rdiPipelineSelector)

  const { values, setFieldValue } = useFormikContext<IPipeline>()

  const isEditing = (index: number) => editJobIndex === index

  const deleteJob = (index: Nullable<number>) =>
    setFieldValue(
      'jobs',
      values.jobs.filter((_, i) => i !== index)
    )

  const handleDeleteClick = () => {
    deleteJob(deleteJobIndex)
    setDeleteJobIndex(null)

    sendEventTelemetry({
      event: TelemetryEvent.RDI_PIPELINE_JOB_DELETED,
      eventData: {
        jobName: deleteJobIndex !== null ? values.jobs[deleteJobIndex]?.name : null
      }
    })

    // if the last job is deleted, select the pipeline config tab
    const jobs = values.jobs.filter((_, i) => i !== deleteJobIndex)
    onSelectedTab(jobs.length <= 0 ? PageNames.rdiPipelineConfig : jobs[0].name)
  }

  const jobName = (name: string, index: number) => (
    <>
      <EuiFlexItem
        grow
        onClick={() => onSelectedTab(name)}
        className={cx(styles.navItem, 'truncateText')}
        data-testid={`rdi-nav-job-${name}`}
      >
        {name}
      </EuiFlexItem>
      <EuiFlexItem grow={false} className={styles.actions} data-testid={`rdi-nav-job-actions-${name}`}>
        <EuiToolTip title="Delete job" position="top" display="inlineBlock" anchorClassName="flex-row">
          <ConfirmationPopover
            title={`Delete ${name}`}
            body={<EuiText size="s">Changes will not be applied until the pipeline is deployed.</EuiText>}
            confirmButtonText="Delete"
            onConfirm={handleDeleteClick}
            button={<EuiButtonIcon iconType="trash" aria-label="delete job" data-testid={`delete-job-${name}`} />}
            onButtonClick={() => {
              setDeleteJobIndex(index)
            }}
          />
        </EuiToolTip>
        <EuiToolTip title="Edit job file name" position="top" display="inlineBlock" anchorClassName="flex-row">
          <EuiButtonIcon
            iconType="pencil"
            onClick={() => {
              onSelectedTab(name)
              setEditJobIndex(index)
              setEditJobName(name)
              setIsNewJob(false)
            }}
            aria-label="edit job file name"
            data-testid={`edit-job-name-${name}`}
          />
        </EuiToolTip>
      </EuiFlexItem>
    </>
  )

  const jobNameEditor = (name: string, index: number) => (
    <EuiFlexItem className={styles.inputContainer} data-testid={`rdi-nav-job-edit-${name}`}>
      <InlineItemEditor
        controlsPosition="right"
        onApply={() => {
          setFieldValue(`jobs.${index}.name`, editJobName)
          setEditJobIndex(null)
          setEditJobName(null)

          sendEventTelemetry({
            event: TelemetryEvent.RDI_PIPELINE_JOB_CREATED,
            eventData: {
              jobName: editJobName
            }
          })

          if (editJobName) {
            onSelectedTab(editJobName)
          }
        }}
        onDecline={() => {
          setEditJobIndex(null)
          setEditJobName(null)

          if (isNewJob) {
            deleteJob(index)
          }
        }}
        isDisabled={!!validateJobName(editJobName, editJobIndex, values.jobs)}
        disabledTooltipText={validateJobName(editJobName, editJobIndex, values.jobs)}
        isLoading={loading}
        declineOnUnmount={false}
        controlsClassName={styles.inputControls}
        formComponentType="div"
      >
        <EuiFieldText
          data-testid={`job-name-input-${index}`}
          className={styles.input}
          maxLength={250}
          isLoading={loading}
          autoComplete="off"
          value={editJobName ?? ''}
          placeholder="Enter job name"
          onChange={(e) => {
            setEditJobName(e.target.value)
          }}
        />
      </InlineItemEditor>
    </EuiFlexItem>
  )

  const renderJobsList = (jobs: IRdiPipelineJob[]) =>
    jobs.map(({ name }, index) => (
      <EuiFlexGroup
        key={name}
        className={cx(styles.fullWidth, styles.job, { [styles.active]: path === name })}
        responsive={false}
        alignItems="center"
        justifyContent="spaceBetween"
        gutterSize="none"
      >
        <EuiFlexGroup className={styles.fullWidth} alignItems="center" gutterSize="none">
          <EuiFlexItem grow={false}>
            <EuiIcon type="document" className={styles.fileIcon} data-test-subj="jobs-folder-icon-close" />
          </EuiFlexItem>
          {isEditing(index) ? jobNameEditor(name, index) : jobName(name, index)}
        </EuiFlexGroup>
      </EuiFlexGroup>
    ))

  const folder = () => (
    <EuiFlexGroup
      className={styles.fullWidth}
      responsive={false}
      alignItems="center"
      justifyContent="spaceBetween"
      gutterSize="none"
    >
      <EuiFlexGroup className={styles.fullWidth} alignItems="center" gutterSize="none">
        <EuiFlexItem grow={false}>
          <EuiIcon
            type={isExpanded ? 'folderOpen' : 'folderClosed'}
            className={styles.folderIcon}
            data-test-subj="jobs-folder-icon"
          />
        </EuiFlexItem>
        <EuiFlexItem grow className="truncateText">
          {'Jobs '}
          {!loading && (
            <EuiTextColor className={styles.jobsCount} component="span" data-testid="rdi-jobs-count">
              {values?.jobs?.length ? `(${values?.jobs?.length})` : ''}
            </EuiTextColor>
          )}
          {loading && <EuiLoadingSpinner data-testid="rdi-nav-jobs-loader" className={styles.loader} />}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexGroup>
  )

  return (
    <EuiAccordion
      id="rdi-pipeline-jobs-nav"
      buttonContent={folder()}
      initialIsOpen={isExpanded}
      onToggle={(isOpen: boolean) => setIsExpanded(isOpen)}
      className={styles.wrapper}
      extraAction={(
        <EuiToolTip title="Add a job file" position="top" display="inlineBlock" anchorClassName="flex-row">
          <EuiButtonIcon
            iconType="plus"
            onClick={() => {
              setIsExpanded(true)
              setFieldValue('jobs', [{ name: '', value: '' }, ...values.jobs])
              setEditJobIndex(0)
              setIsNewJob(true)
            }}
            aria-label="add new job file"
            data-testid="add-new-job"
          />
        </EuiToolTip>
      )}
    >
      {/* // TODO confirm with RDI team and put sort in separate component */}
      {renderJobsList(values?.jobs ?? [])}
    </EuiAccordion>
  )
}

export default JobsTree
