/*
 * Copyright 2017, GeoSolutions Sas.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */
const React = require('react');
const PropTypes = require('prop-types');
const Message = require('../I18N/Message');
const LocaleUtils = require('../../utils/LocaleUtils');
const assign = require('object-assign');
const {omit} = require('lodash');
const BorderLayout = require('../layout/BorderLayout');
const Select = require('react-select');
const SwitchPanel = require('../misc/switch/SwitchPanel');
const Toolbar = require('../misc/toolbar/Toolbar');
const {FormControl, FormGroup, Alert, Pagination, Checkbox, Button, Panel, Form, Col, InputGroup, ControlLabel, Glyphicon} = require('react-bootstrap');
const Spinner = require('react-spinkit');

const RecordGrid = require('./RecordGrid');

class Catalog extends React.Component {
    static propTypes = {
        active: PropTypes.bool,
        addAuthentication: PropTypes.bool,
        buttonClassName: PropTypes.string,
        buttonStyle: PropTypes.object,
        currentLocale: PropTypes.string,
        formats: PropTypes.array,
        format: PropTypes.string,
        gridOptions: PropTypes.object,
        includeSearchButton: PropTypes.bool,
        includeResetButton: PropTypes.bool,
        loadingError: PropTypes.object,
        layerError: PropTypes.string,
        mode: PropTypes.string,
        newService: PropTypes.object,
        onAddService: PropTypes.func,
        onChangeAutoload: PropTypes.func,
        onChangeCatalogMode: PropTypes.func,
        onChangeFormat: PropTypes.func,
        onChangeTitle: PropTypes.func,
        onChangeText: PropTypes.func,
        onChangeType: PropTypes.func,
        onChangeUrl: PropTypes.func,
        onChangeSelectedService: PropTypes.func,
        onDeleteService: PropTypes.func,
        onError: PropTypes.func,
        onLayerAdd: PropTypes.func,
        onReset: PropTypes.func,
        onSearch: PropTypes.func,
        onZoomToExtent: PropTypes.func,
        pageSize: PropTypes.number,
        records: PropTypes.array,
        authkeyParamNames: PropTypes.array,
        recordItem: PropTypes.element,
        result: PropTypes.object,
        saving: PropTypes.bool,
        searchOptions: PropTypes.object,
        selectedService: PropTypes.string,
        services: PropTypes.object,
        showGetCapLinks: PropTypes.bool,
        wrapOptions: PropTypes.bool,
        zoomToLayer: PropTypes.bool,
        hideThumbnail: PropTypes.bool,
        hideIdentifier: PropTypes.bool,
        hideExpand: PropTypes.bool,
        source: PropTypes.string,
        onAddBackgroundProperties: PropTypes.func,
        modalParams: PropTypes.object,
        layers: PropTypes.array,
        onUpdateThumbnail: PropTypes.func,
        unsavedChanges: PropTypes.bool,
        removeThumbnail: PropTypes.func,
        clearModal: PropTypes.func
    };

    static contextTypes = {
        messages: PropTypes.object
    };

    static defaultProps = {
        buttonClassName: "search-button",
        buttonStyle: {
            marginBottom: "10px",
            marginRight: "5px"
        },
        currentLocale: 'en-US',
        formats: [{name: 'csw', label: 'CSW'}],
        format: 'csw',
        includeSearchButton: true,
        includeResetButton: false,
        mode: "view",
        newService: {
            title: "",
            type: "wms",
            url: ""
        },
        onAddService: () => {},
        onChangeAutoload: () => {},
        onChangeCatalogMode: () => {},
        onChangeFormat: () => {},
        onChangeTitle: () => {},
        onChangeText: () => {},
        onChangeType: () => {},
        onChangeUrl: () => {},
        onChangeSelectedService: () => {},
        onDeleteService: () => {},
        onError: () => {},
        onLayerAdd: () => {},
        onReset: () => {},
        onSearch: () => {},
        onZoomToExtent: () => {},
        removeThumbnail: () => {},
        pageSize: 4,
        records: [],
        saving: false,
        services: {},
        wrapOptions: false,
        zoomToLayer: true
    };

    state = {
        loading: false,
        catalogURL: null
    };

    componentDidMount() {
        if (this.props.selectedService &&
            this.isValidServiceSelected() &&
            this.props.services[this.props.selectedService].autoload) {
            this.search({services: this.excludedBackgrounds(), selectedService: this.props.selectedService, searchText: this.props.searchText});
        }
    }

    componentWillReceiveProps(nextProps) {
        if (nextProps !== this.props) {
            this.setState({
                loading: false
            });
            if (((nextProps.mode === "view" && this.props.mode === "edit") || nextProps.services !== this.props.services || nextProps.selectedService !== this.props.selectedService) &&
                nextProps.active && this.props.active &&
                nextProps.selectedService &&
                nextProps.services[nextProps.selectedService] &&
                nextProps.services[nextProps.selectedService].autoload) {
                this.search({services: nextProps.services, selectedService: nextProps.selectedService, searchText: nextProps.searchText});
            }
            if (nextProps.active && this.props.active === false &&
                nextProps.selectedService &&
                nextProps.services[nextProps.selectedService] &&
                nextProps.services[nextProps.selectedService].autoload) {
                this.search({services: nextProps.services, selectedService: nextProps.selectedService, searchText: nextProps.searchText});
            }
        }
    }

    onSearchTextChange = (event) => {
        this.props.onChangeText(event.target.value);
    };

    onKeyDown = (event) => {
        if (event.keyCode === 13) {
            this.search({services: this.excludedBackgrounds(), selectedService: this.props.selectedService, searchText: this.props.searchText});
        }
    };

    renderResult = () => {
        if (this.props.result) {
            if (this.props.result.numberOfRecordsMatched === 0) {
                return (<div>
                    <Message msgId="catalog.noRecordsMatched" />
                </div>);
            }
            return this.renderRecords();
        } else if (this.props.loadingError) {
            return this.renderError();
        }
    };

    renderError = (error) => {
        return (<Alert bsStyle="danger">
            <Message msgId={error || 'catalog.error'} />
          </Alert>);
    };

    renderLoading = () => {
        return this.state.loading ? <Spinner spinnerName="circle" noFadeIn overrideSpinnerClassName="spinner"/> : null;
    };
    renderSaving = () => {
        return this.props.saving ? <Spinner spinnerName="circle" noFadeIn overrideSpinnerClassName="spinner"/> : null;
    };

    renderPagination = () => {
        if (this.props.result) {
            let total = this.props.result.numberOfRecordsMatched;
            let returned = this.props.result.numberOfRecordsReturned;
            let start = this.props.searchOptions.startPosition;
            // let next = this.props.result.nextRecord;
            let pageSize = this.props.pageSize;
            let page = Math.floor( start / pageSize);
            let pageN = Math.ceil(total / pageSize);
            return (<div className="catalog-pagination"><Pagination
                prev next first last ellipsis boundaryLinks
                bsSize="small"
                items={pageN}
                maxButtons={5}
                activePage={page + 1}
                onSelect={this.handlePage} />
            <div className="push-right">
                <Message msgId="catalog.pageInfo" msgParams={{start, end: start + returned - 1, total}} />
                {this.renderLoading()}
            </div>
        </div>);
        }
        return null;
    };

    renderRecords = () => {
        return (<div className="catalog-results">
                <RecordGrid {...this.props.gridOptions} key="records"
                    clearModal={this.props.clearModal}
                    unsavedChanges={this.props.unsavedChanges}
                    onUpdateThumbnail = {this.props.onUpdateThumbnail}
                    layers={this.props.layers}
                    modalParams= {this.props.modalParams}
                    onAddBackgroundProperties={this.props.onAddBackgroundProperties}
                    source={this.props.source}
                    records={this.props.records}
                    authkeyParamNames={this.props.authkeyParamNames}
                    catalogURL={this.isValidServiceSelected() && this.props.services[this.props.selectedService].url || ""}
                    catalogType={this.props.services[this.props.selectedService] && this.props.services[this.props.selectedService].type}
                    onLayerAdd={this.props.onLayerAdd}
                    onZoomToExtent={this.props.onZoomToExtent}
                    zoomToLayer={this.props.zoomToLayer}
                    onError={this.props.onError}
                    showGetCapLinks={this.props.showGetCapLinks}
                    addAuthentication={this.props.addAuthentication}
                    currentLocale={this.props.currentLocale}
                    recordItem={this.props.recordItem}
                    hideThumbnail={this.props.hideThumbnail}
                    hideIdentifier={this.props.hideIdentifier}
                    hideExpand={this.props.hideExpand}
                    onAdd={() => {
                        this.search({services: this.excludedBackgrounds(), selectedService: this.props.selectedService});
                    }}
                />
        </div>);
    };

    renderButtons = () => {
        const buttons = [];
        if (this.props.mode === "view" ) {
            if (this.props.includeSearchButton) {
                buttons.push(<Button bsStyle="primary" style={this.props.buttonStyle} onClick={() => this.search({services: this.excludedBackgrounds(), selectedService: this.props.selectedService, searchText: this.props.searchText})}
                            className={this.props.buttonClassName} key="catalog_search_button" disabled={!this.isValidServiceSelected()}>
                            {this.renderLoading()} <Message msgId="catalog.search"/>
                        </Button>);
            }
            if (this.props.includeResetButton) {
                buttons.push(<Button style={this.props.buttonStyle} onClick={this.reset} key="catalog_reset_button">
                            <Message msgId="catalog.reset"/>
                        </Button>);
            }
        }
        if (this.props.mode === "edit") {
            buttons.push(<Button style={this.props.buttonStyle} disabled={this.props.saving} onClick={() => this.props.onAddService()} key="catalog_add_service_button">
                        {this.renderSaving()} <Message msgId="save"/>
                    </Button>);
            if (!this.props.newService.isNew) {
                buttons.push(<Button style={this.props.buttonStyle} onClick={() => this.props.onDeleteService()} key="catalog_delete_service_button">
                            <Message msgId="catalog.delete"/>
                        </Button>);
            }
            buttons.push(<Button style={this.props.buttonStyle} disabled={this.props.saving} onClick={() => this.props.onChangeCatalogMode("view")} key="catalog_back_view_button">
                        <Message msgId="cancel"/>
                    </Button>);

            return [
                {
                    glyph: 'arrow-left',
                    tooltip: 'Back to catalog',
                    onClick: () => this.props.onChangeCatalogMode("view")
                },
                {
                    glyph: 'floppy-disk',
                    tooltip: 'Save',
                    onClick: () => this.props.onAddService()
                },
                {
                    glyph: 'trash',
                    tooltip: 'Remove catalog',
                    visible: !this.props.newService.isNew ? true : false,
                    onClick: () => this.props.onDeleteService()
                }
            ];
        }
        return buttons;
    };

    renderTextSearch = () => {
        const textSearch = (<FormControl
            ref="searchText"
            type="text"
            style={{
                textOverflow: "ellipsis"
            }}
            value={this.props.searchText}
            placeholder={LocaleUtils.getMessageById(this.context.messages, "catalog.textSearchPlaceholder")}
            onChange={this.onSearchTextChange}
            onKeyDown={this.onKeyDown}/>);
        return this.props.wrapOptions ? (<Panel collapsible defaultExpanded={false} header={LocaleUtils.getMessageById(this.context.messages, "catalog.options")}>
            {textSearch}
        </Panel>) : textSearch;
    }
    renderFormats = () => {
        return this.props.formats.map((format) => <option value={format.name} key={format.name}>{format.label}</option>);
    };
    getServices = () => {
        return Object.keys(this.excludedBackgrounds()).map(s => {
            return assign({}, this.props.services[s], {label: this.props.services[s].title, value: s});
        });
    };
    render() {
        return (
            this.isViewMode(this.props.mode) ? (
                <BorderLayout
                    key="catalog-BorderLayout"
                    header={(<Form>
                                <FormGroup controlId="labelService" key="labelService">
                                    <ControlLabel><Message msgId="catalog.service"/></ControlLabel>
                                </FormGroup>
                                <FormGroup controlId="service" key="service">
                                    <InputGroup>
                                        <Select
                                            clearValueText={LocaleUtils.getMessageById(this.context.messages, "catalog.clearValueText")}
                                            noResultsText={LocaleUtils.getMessageById(this.context.messages, "catalog.noResultsText")}
                                            clearable
                                            options={this.getServices()}
                                            value={this.props.selectedService}
                                            onChange={(val) => this.props.onChangeSelectedService(val && val.value ? val.value : "")}
                                            placeholder={LocaleUtils.getMessageById(this.context.messages, "catalog.servicePlaceholder")} />

                                        {this.isValidServiceSelected() && this.props.selectedService !== 'Map Backgrounds' ? (<InputGroup.Addon className="btn"
                                            onClick={() => this.props.onChangeCatalogMode("edit", false)}>
                                            <Glyphicon glyph="pencil"/>
                                        </InputGroup.Addon>) : null}
                                        <InputGroup.Addon className="btn" onClick={() => this.props.onChangeCatalogMode("edit", true)}>
                                            <Glyphicon glyph="plus"/>
                                        </InputGroup.Addon>
                                    </InputGroup>
                                </FormGroup>
                                <FormGroup controlId="searchText" key="searchText">
                                    {this.renderTextSearch()}
                                </FormGroup>
                                <FormGroup controlId="buttons" key="buttons">
                                    {this.renderButtons()}
                                    {this.props.layerError ? this.renderError(this.props.layerError) : null}
                                </FormGroup>
                            </Form>)}
                    footer={this.renderPagination()}>
                            <div>
                                {this.renderResult()}
                            </div>
                        </BorderLayout>
            ) : (
                <BorderLayout header={
                    <Toolbar
                        btnGroupProps={{
                            className: 'text-center'
                        }}
                        btnDefaultProps={{
                            bsStyle: "primary",
                            className: "square-button-md"
                        }}
                        buttons={this.renderButtons()}/>
                }>

                <Form horizontal >

                    <FormGroup style={{ padding: '8px', paddingBottom: 0, width: 'unset'}}>
                        <Col xs={12}>
                            <ControlLabel><Message msgId="catalog.url"/></ControlLabel>
                            <FormControl
                                ref="url"
                                type="text"
                                style={{
                                    textOverflow: "ellipsis"
                                }}
                                placeholder={LocaleUtils.getMessageById(this.context.messages, "catalog.urlPlaceholder")}
                                value={this.props.newService && this.props.newService.url}
                                onChange={(e) => this.props.onChangeUrl(e.target.value)}/>
                        </Col>
                    </FormGroup>
                    <FormGroup style={{ padding: '8px', width: 'unset'}} controlId="title" key="title">
                        <Col xs={12} sm={3} md={3}>
                            <ControlLabel><Message msgId="catalog.type"/></ControlLabel>
                            <FormControl
                                onChange={(e) => this.props.onChangeType(e.target.value)}
                                value={this.props.newService && this.props.newService.type}
                                componentClass="select">
                                {this.renderFormats()}
                            </FormControl>
                        </Col>
                        <Col xs={12} sm={9} md={9}>
                            <ControlLabel><Message msgId="catalog.serviceTitle"/></ControlLabel>
                            <FormControl
                                ref="title"
                                type="text"
                                style={{
                                    textOverflow: "ellipsis"
                                }}
                                placeholder={LocaleUtils.getMessageById(this.context.messages, "catalog.serviceTitlePlaceholder")}
                                value={this.props.newService && this.props.newService.title}
                                onChange={(e) => this.props.onChangeTitle(e.target.value)}/>
                        </Col>
                    </FormGroup>

                    </Form>

                    <SwitchPanel expanded={this.state.expanded} title={<div style={{paddingLeft: 14}}>Advanced Settings</div>} onSwitch={expanded => this.setState({expanded})}>


                        <FormGroup style={{ overflow: 'hidden'}}>
                        <Col xs={12} ><Checkbox value="autoload" onChange={(e) => this.props.onChangeAutoload(e.target.checked)} checked={this.props.newService.autoload}>
                                  <Message msgId="catalog.autoload"/>
                                </Checkbox></Col>

                        <Col xs={12} ><hr/><Checkbox onChange={() => this.setState({activeBasic: !this.state.activeBasic})}>Basic Authentication</Checkbox></Col>
                                <div style={{marginBottom: 8, width: '100%'}}>
                        <Col xs={6} >
                            <ControlLabel>Username</ControlLabel>
                            </Col>
                            <Col xs={6} style={{marginBottom: 8}}>
                            <FormControl
                                ref="url"
                                type="text"
                                placeholder="Enter password"
                                disabled={!this.state.activeBasic}/>
                                </Col>
                                </div>
                                <div>
                                <Col xs={6} >

                            <ControlLabel>Password</ControlLabel>
                            </Col>
                            <Col xs={6} >
                            <FormControl
                                ref="url"
                                type="text"
                                disabled={!this.state.activeBasic}
                                placeholder="Enter authkey"/>
                                </Col>
                                </div>
                    </FormGroup>
                    <Col xs={12} ><hr/></Col>
                    <FormGroup>
                    <Col xs={6} >
                            <ControlLabel>Format</ControlLabel>
                            </Col >
                            <Col xs={6} >
                            <Select
                                value="image/png"
                                clearable={false}
                                options={[{
                                    label: 'image/png',
                                    value: 'image/png'
                                }, {
                                    label: 'image/png8',
                                    value: 'image/png8'
                                }, {
                                    label: 'image/jpeg',
                                    value: 'image/jpeg'
                                }, {
                                    label: 'image/vnd.jpeg-png',
                                    value: 'image/vnd.jpeg-png'
                                }, {
                                    label: 'image/gif',
                                    value: 'image/gif'
                                }]}/>
                                </Col >
                        </FormGroup>
                    </SwitchPanel >
                    </BorderLayout>
                )
        );
    }

    isValidServiceSelected = () => {
        // if (this.props.source === 'backgroundSelector') {
        //     return this.props.services[this.props.selectedService] === 'Map Background';
        // }
        return this.props.services[this.props.selectedService] !== undefined;

    };
    search = ({services, selectedService, start = 1, searchText = ""} = {}) => {
        const url = services[selectedService].url;
        const type = services[selectedService].type;
        this.props.onSearch(type, url, start, this.props.pageSize, searchText || "");
        this.setState({
            loading: true
        });
    };

    isViewMode = (mode) => {
        return mode === "view";
    }

    reset = () => {
        if (this.refs.catalogURL) {
            this.refs.catalogURL.refs.input.value = '';
        }
        if (this.refs.searchText) {
            this.refs.searchText.refs.input.value = '';
        }
        this.props.onReset();
    };

    handlePage = (eventKey) => {
        if (eventKey) {
            let start = (eventKey - 1) * this.props.pageSize + 1;
            this.search({services: this.excludedBackgrounds(), selectedService: this.props.selectedService, start, searchText: this.props.searchText});
            this.setState({
                loading: true
            });
        }
    };
    excludedBackgrounds = () => {
        if (this.props.source !== 'backgroundSelector') {
            return omit(this.props.services, 'Map Backgrounds');
        }
        return this.props.services;
    };
}

module.exports = Catalog;
