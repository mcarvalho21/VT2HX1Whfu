/**
 * Copyright 2017 Intel Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ----------------------------------------------------------------------------
 */

const m = require('mithril')

const api = require('../services/api')
const payloads = require('../services/payloads')
const transactions = require('../services/transactions')
const parsing = require('../services/parsing')
const forms = require('../components/forms')
const layout = require('../components/layout')

/**
 * Possible selection options
 */
const authorizableProperties = [
  ['weight', 'Weight'],
  ['location', 'Location'],
  ['temperature', 'Temperature'],
  ['shock', 'Shock'],
  ['supplier', 'Supplier']
]

/**
 * The Form for tracking a new asset.
 */
const AddAssetForm = {
  oninit (vnode) {
    // Initialize the empty reporters fields
    vnode.state.reporters = [
      {
        reporterKey: '',
        properties: []
      }
    ]
    api.get('agents')
      .then(agents => {
        const publicKey = api.getPublicKey()
        vnode.state.agents = agents.filter(agent => agent.key !== publicKey)
      })
  },

  view (vnode) {
    const setter = forms.stateSetter(vnode.state)
    return [
      m('.add_asset_form',
        m('form', {
          onsubmit: (e) => {
            e.preventDefault()
            _handleSubmit(vnode.attrs.signingKey, vnode.state)
          }
        },
        m('legend', 'Track New Asset'),
        forms.textInput(setter('serialNumber'), 'Tracking Number'),

        layout.row([
          forms.textInput(setter('type'), 'Type'),
          forms.textInput(setter('subtype'), 'Subtype', false)
        ]),

        layout.row([
          forms.textInput(setter('supplier'), 'Supplier')
        ]),

        forms.group('Weight (kg)', forms.field(setter('weight'), {
          type: 'number',
          step: 'any',
          min: 0,
          required: false
        })),

        layout.row([
          forms.group('Latitude', forms.field(setter('latitude'), {
            type: 'number',
            step: 'any',
            min: -90,
            max: 90,
            required: false
          })),
          forms.group('Longitude', forms.field(setter('longitude'), {
            type: 'number',
            step: 'any',
            min: -180,
            max: 180,
            required: false
          }))
        ]),

        m('.reporters.form-group',
          m('label', 'Authorize Reporters'),
          vnode.state.reporters.map((reporter, i) =>
            m('.row.mb-2',
              m('.col-sm-8',
                m('input.form-control', {
                  type: 'text',
                  placeholder: 'Add reporter by name or public key...',
                  oninput: m.withAttr('value', (value) => {
                    // clear any previously matched values
                    vnode.state.reporters[i].reporterKey = null
                    const reporter = vnode.state.agents.find(agent => {
                      return agent.name === value || agent.key === value
                    })
                    if (reporter) {
                      vnode.state.reporters[i].reporterKey = reporter.key
                    }
                  }),
                  onblur: () => _updateReporters(vnode, i)
                })),

             m('.col-sm-4',
                m(forms.MultiSelect, {
                  label: 'Select Fields',
                  options: authorizableProperties,
                  selected: reporter.properties,
                  onchange: (selection) => {
                    vnode.state.reporters[i].properties = selection
                  }
                }))))),

        m('.row.justify-content-end.align-items-end',
          m('col-2',
            m('button.btn.btn-primary',
              'Create Record')))))
    ]
  }
}

/**
 * Update the reporter's values after a change occurs in the name of the
 * reporter at the given reporterIndex. If it is empty, and not the only
 * reporter in the list, remove it.  If it is not empty and the last item
 * in the list, add a new, empty reporter to the end of the list.
 */
const _updateReporters = (vnode, reporterIndex) => {
  let reporterInfo = vnode.state.reporters[reporterIndex]
  let lastIdx = vnode.state.reporters.length - 1
  if (!reporterInfo.reporterKey && reporterIndex !== lastIdx) {
    vnode.state.reporters.splice(reporterIndex, 1)
  } else if (reporterInfo.reporterKey && reporterIndex === lastIdx) {
    vnode.state.reporters.push({
      reporterKey: '',
      properties: []
    })
  }
}

/**
 * Handle the form submission.
 *
 * Extract the appropriate values to pass to the create record transaction.
 */
const _handleSubmit = (signingKey, state) => {
  const properties = [{
    name: 'type',
    stringValue: state.type,
    dataType: payloads.createRecord.enum.STRING
  }]

  if (state.subtype) {
    properties.push({
      name: 'subtype',
      stringValue: state.subtype,
      dataType: payloads.createRecord.enum.STRING
    })
  }

  if (state.supplier) {
    properties.push({
      name: 'supplier',
      stringValue: state.supplier,
      dataType: payloads.createRecord.enum.STRING
    })
  }

  if (state.ranch) {
    properties.push({
      name: 'ranch',
      stringValue: state.ranch,
      dataType: payloads.createRecord.enum.STRING
    })
  }

  if (state.coo) {
    properties.push({
      name: 'coo',
      stringValue: state.coo,
      dataType: payloads.createRecord.enum.STRING
    })
  }

  if (state.nodeType) {
    properties.push({
      name: 'nodeType',
      stringValue: state.nodeType,
      dataType: payloads.createRecord.enum.STRING
    })
  }

  if (state.itemId) {
    properties.push({
      name: 'itemId',
      stringValue: state.itemId,
      dataType: payloads.createRecord.enum.STRING
    })
  }

  if (state.quantity) {
    properties.push({
      name: 'quantity',
      stringValue: parsing.toInt(state.quantity),
      dataType: payloads.createRecord.enum.INT
    })
  }  

  if (state.uom) {
    properties.push({
      name: 'uom',
      stringValue: state.uom,
      dataType: payloads.createRecord.enum.STRING
    })
  }  
  
  if (state.description) {
    properties.push({
      name: 'description',
      stringValue: state.description,
      dataType: payloads.createRecord.enum.STRING
    })
  }
  
  if (state.qualityInfo) {
    properties.push({
      name: 'qualityInfo',
      stringValue: state.qualityInfo,
      dataType: payloads.createRecord.enum.STRING
    })
  }    

  if (state.inventDimensions) {
    properties.push({
      name: 'inventDimensions',
      stringValue: state.inventDimensions,
      dataType: payloads.createRecord.enum.STRING
    })
  }  

  if (state.lot) {
    properties.push({
      name: 'lot',
      stringValue: state.lot,
      dataType: payloads.createRecord.enum.STRING
    })
  }  

  if (state.lotBatch) {
    properties.push({
      name: 'lotBatch',
      stringValue: state.lotBatch,
      dataType: payloads.createRecord.enum.STRING
    })
  }
  
  if (state.referenceId) {
    properties.push({
      name: 'referenceId',
      stringValue: state.referenceId,
      dataType: payloads.createRecord.enum.STRING
    })
  }  

  if (state.actionDate) {
    properties.push({
      name: 'actionDate',
      stringValue: state.actionDate,
      dataType: payloads.createRecord.enum.STRING
    })
  }   

  if (state.weight) {
    properties.push({
      name: 'weight',
      intValue: parsing.toInt(state.weight),
      dataType: payloads.createRecord.enum.INT
    })
  }

  if (state.latitude && state.longitude) {
    properties.push({
      name: 'location',
      locationValue: {
        latitude: parsing.toInt(state.latitude),
        longitude: parsing.toInt(state.longitude)
      },
      dataType: payloads.createRecord.enum.LOCATION
    })
  }

  if (state.attachments) {
    properties.push({
      name: 'attachments',
      stringValue: state.attachments,
      dataType: payloads.createRecord.enum.STRING
    })
  }  

  if (state.refBlocks) {
    properties.push({
      name: 'refBlocks',
      stringValue: state.refBlocks,
      dataType: payloads.createRecord.enum.STRING
    })
  }   

  const recordPayload = payloads.createRecord({
    recordId: state.serialNumber,
    recordType: 'asset',
    properties
  })

  const reporterPayloads = state.reporters
    .filter((reporter) => !!reporter.reporterKey)
    .map((reporter) => payloads.createProposal({
      recordId: state.serialNumber,
      receivingAgent: reporter.reporterKey,
      role: payloads.createProposal.enum.REPORTER,
      properties: reporter.properties
    }))

  transactions.submit([recordPayload].concat(reporterPayloads), true)
    .then(() => m.route.set(`/assets/${state.serialNumber}`))
}

module.exports = AddAssetForm
