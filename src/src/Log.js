import React from 'react';
import PropTypes from 'prop-types';
import IconButton from '@material-ui/core/IconButton';
import {MdDeleteForever as IconDelete} from 'react-icons/md';
import {MdVerticalAlignBottom as IconBottom} from 'react-icons/md';
import {MdContentCopy as IconCopy} from 'react-icons/md';

import I18n from './i18n';
import {withStyles} from "@material-ui/core/styles/index";

function getTimeString(d) {
    let text;
    let i = d.getHours();
    if (i < 10) i = '0' + i.toString();
    text = i + ':';

    i = d.getMinutes();
    if (i < 10) i = '0' + i.toString();
    text += i + ':';
    i = d.getSeconds();
    if (i < 10) i = '0' + i.toString();
    text += i + '.';
    i = d.getMilliseconds();
    if (i < 10) {
        i = '00' + i.toString();
    } else if (i < 100) {
        i = '0' + i.toString();
    }
    text += i;
    return text;
}
const TOOLBOX_WIDTH = 34;

const styles = theme => ({
    logBox: {
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden'
    },
    logBoxInner: {
        color: theme.palette.type === 'dark' ? 'white' : 'black',
        width: `calc(100% - ${TOOLBOX_WIDTH}px)`,
        height: '100%',
        marginLeft: TOOLBOX_WIDTH,
        overflow: 'auto',
        position: 'relative'
    },
    info: {
        background: theme.palette.type === 'dark' ? 'darkgrey' : 'lightgrey',
        color: theme.palette.type === 'dark' ?  'black' : 'black'
    },
    error: {
        background: '#FF0000',
        color: theme.palette.type === 'dark' ?  'black' : 'white'
    },
    warn: {
        background: '#FF8000',
        color: theme.palette.type === 'dark' ?  'black' : 'white'
    },
    debug: {
        background: 'gray',
        opacity: 0.8,
        color: theme.palette.type === 'dark' ?  'black' : 'white'
    },
    silly: {
        background: 'gray',
        opacity: 0.6,
        color: theme.palette.type === 'dark' ? 'black' : 'white'
    },
    table: {
        fontFamily: 'monospace',
        width: '100%',

    },
    toolbox: {
        position: 'absolute',
        top: 0,
        left: 0,
        marginLeft: 2,
        width: TOOLBOX_WIDTH,
        height: '100%',
        boxShadow: '2px 0px 4px -1px rgba(0, 0, 0, 0.2), 4px 0px 5px 0px rgba(0, 0, 0, 0.14), 1px 0px 10px 0px rgba(0, 0, 0, 0.12)'
    },
    trTime: {
        width: 90
    },
    trSeverity: {
        width: 40,
        fontWeight: 'bold'
    },
    iconButtons: {
        width: 32,
        height: 32,
        padding: 4
    }
});

function copyToClipboard(str) {
    const el = window.document.createElement('textarea');
    el.value = str;
    window.document.body.appendChild(el);
    el.select();
    window.document.execCommand('copy');
    window.document.body.removeChild(el);
}

function paddingMs(ms) {
    if (ms < 10) return '00' + ms;
    if (ms < 100) return '0' + ms;
    return ms;
}
class Log extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            lines: {},
            goBottom: true,
            selected: null,
            editing: this.props.editing || []
        };
        this.text = {};
        this.lastIndex = null;
        this.messagesEnd = React.createRef();
        this.logHandlerBound = this.logHandler.bind(this);
    }

    generateLine(message) {
        return (<tr key={'tr_' + message.ts} className={this.props.classes[message.severity]}>
            <td key="tdTime" className={this.props.classes.trTime}>{getTimeString(new Date(message.ts))}</td>
            <td key="tdSeverity" className={this.props.classes.trSeverity}>{message.severity}</td>
            <td key="tdMessage">{message.message}</td>
        </tr>);
    }

    scrollToBottom() {
        this.messagesEnd && this.messagesEnd.current && this.messagesEnd.current.scrollIntoView({behavior: 'smooth'});
    }
    logHandler(message) {
        let allLines = this.state.lines;
        const selected = this.state.editing.find(id => message.message.indexOf(id) !== -1);
        if (!selected) return;

        let lines = allLines[selected] || [];
        let text = this.text[selected] || [];

        lines.push(this.generateLine(message));
        let severity = message.severity;
        if (severity === 'info' || severity === 'warn') {
            severity += ' ';
        }
        const date = new Date(message.ts);
        text.push(`${date.toLocaleString()}.${paddingMs(date.getMilliseconds())}\t[${severity}]: ${message.message}`);
        if (lines.length > 300) {
            lines.splice(0, lines.length - 300);
            text.splice(0, lines.length - 300);
        }
        this.text[selected] = text;
        allLines[selected] = lines;

        this.setState({lines: allLines});
    }

    componentDidMount() {
        this.props.connection.registerLogHandler(this.logHandlerBound);
    }

    componentWillUnmount() {
        this.props.connection.unregisterLogHandler(this.logHandlerBound);
    }

    componentDidUpdate() {
        this.state.goBottom && this.scrollToBottom();
    }

    componentWillReceiveProps(nextProps) {
        if (nextProps.selected !== this.state.selected) {
            let selected = nextProps.selected;
            let allLines = this.state.lines;
            allLines[selected] = allLines[selected] || [];
            this.text[selected] = this.text[selected] || [];
            this.setState({selected});
        }

        if (JSON.stringify(nextProps.editing) !== JSON.stringify(this.state.editing)) {
            const editing = JSON.parse(JSON.stringify(nextProps.editing));
            let allLines = this.state.lines;
            for (const id in this.text) {
                if (this.text.hasOwnProperty(id)) {
                    if (editing.indexOf(id) === -1) {
                        delete this.text[id];
                        delete allLines[id];
                    }
                }
            }

            this.setState({editing});
        }
    }

    onCopy() {
        copyToClipboard((this.text[this.state.selected] || []).join('\n'));
    }

    clearLog() {
        let allLines = this.state.lines;
        if (allLines[this.state.selected]) {
            allLines[this.state.selected] = [];
        }
        if (this.text[this.state.selected]) {
            this.text[this.state.selected] = [];
        }
        this.setState({lines: allLines});
    }

    render() {
        const lines = this.state.selected && this.state.lines[this.state.selected];
        return (
            <div className={this.props.classes.logBox}>
                <div className={this.props.classes.toolbox} key="toolbox">
                    <IconButton className={this.props.classes.iconButtons} onClick={() => this.setState({goBottom: !this.state.goBottom})} color={this.state.goBottom ? 'secondary' : ''}><IconBottom/></IconButton>
                    {lines && lines.length ? (<IconButton className={this.props.classes.iconButtons} onClick={() => this.clearLog()}><IconDelete/></IconButton>) : null}
                    {lines && lines.length ? (<IconButton className={this.props.classes.iconButtons} onClick={() => this.onCopy()}><IconCopy/></IconButton>) : null}
                </div>
                {this.state.selected && lines && lines.length ?
                    (<div className={this.props.classes.logBoxInner} key="logList">
                        <table key="logTable" className={this.props.classes.table}><tbody>{lines}</tbody></table>
                        <div key="logScrollPoint" ref={this.messagesEnd} style={{float: 'left', clear: 'both'}}/>
                    </div>) :
                    (<div key="logList" className={this.props.classes.logBoxInner} style={{paddingLeft: 10}}>{I18n.t('Log outputs')}</div>)
                }
            </div>
        );
    }
}

Log.propTypes = {
    selected: PropTypes.string
};

export default withStyles(styles)(Log);
