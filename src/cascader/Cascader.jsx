import React from 'react';
import ReactDOM from 'react-dom';
import ClickOutside from 'react-click-outside';
import debounce from 'throttle-debounce/debounce';
import Popper from '../../libs/utils/popper';
import { Component, PropTypes, View } from '../../libs';

import CascaderMenu from './Menu';
import Input from '../input';
import i18n from '../locale';

class Cascader extends Component {
  constructor(props) {
    super(props);

    this.state = {
      currentValue: props.value,
      menu: null,
      menuVisible: false,
      inputHover: false,
      inputValue: '',
      flatOptions: this.flattenOptions(props.options)
    }

    this.debouncedInputChange = debounce(props.debounce, () => {
      this.handleInputChange(this.state.inputValue);
    });
  }

  getChildContext() {
    return {
      component: this
    };
  }

  componentWillReceiveProps(props) {
    this.setState({
      currentValue: props.value,
      flatOptions: this.flattenOptions(props.options),
    });

    this.state.menu.setState({
      options: props.options
    });
  }

  componentDidUpdate(props, state) {
    const { menuVisible } = this.state;

    if (menuVisible != state.menuVisible) {
      if (menuVisible) {
        this.showMenu();

        if (this.popperJS) {
          this.popperJS.update();
        } else {
          this.popperJS = new Popper(ReactDOM.findDOMNode(this.refs.input), this.refs.menu, {
            gpuAcceleration: false
          });
        }
      } else {
        this.hideMenu();

        if (this.popperJS) {
          this.popperJS.destroy();
        }

        delete this.popperJS;
      }
    }
  }

  componentWillUnmount() {
    if (this.popperJS) {
      this.popperJS.destroy();
    }
  }

  updatePopper() {
    if (this.popperJS) {
      this.popperJS.update();
    }
  }

  initMenu(menu) {
    this.state.menu = menu;
  }

  showMenu() {
    this.state.menu.setState({
      value: this.state.currentValue.slice(0),
      visible: true,
      options: this.props.options,
      inputWidth: ReactDOM.findDOMNode(this.refs.input).offsetWidth - 2
    });
  }

  hideMenu() {
    this.setState({ inputValue: '' });

    if (this.state.menu) {
      this.state.menu.setState({ visible: false });
    }
  }

  handleActiveItemChange(value) {
    this.updatePopper();

    if (this.props.activeItemChange) {
      this.props.activeItemChange(value);
    }
  }

  handlePick(value, close = true) {
    this.setState({
      currentValue: value
    });

    if (close) {
      this.setState({ menuVisible: false });
    }

    if (this.props.onChange) {
      this.props.onChange(value);
    }
  }

  handleInputChange(value) {
    if (!this.state.menuVisible) return;

    const flatOptions = this.state.flatOptions;

    if (!value) {
      this.state.menu.setState({
        options: this.props.options
      });
      return;
    }

    let filteredFlatOptions = flatOptions.filter(optionsStack => {
      return optionsStack.some(option => new RegExp(value, 'i').test(option[this.labelKey()]));
    });

    if (filteredFlatOptions.length > 0) {
      filteredFlatOptions = filteredFlatOptions.map(optionStack => {
        return {
          __IS__FLAT__OPTIONS: true,
          value: optionStack.map(item => item[this.valueKey()]),
          label: this.renderFilteredOptionLabel(value, optionStack)
        };
      });
    } else {
      filteredFlatOptions = [{
        __IS__FLAT__OPTIONS: true,
        label: i18n.t('el.cascader.noMatch'),
        value: '',
        disabled: true
      }];
    }

    this.state.menu.setState({
      options: filteredFlatOptions
    });
  }

  renderFilteredOptionLabel(inputValue, optionsStack) {
    return optionsStack.map((option, index) => {
      const label = option[this.labelKey()];
      const keywordIndex = label.toLowerCase().indexOf(inputValue.toLowerCase());
      const labelPart = label.slice(keywordIndex, inputValue.length + keywordIndex);
      const node = keywordIndex > -1 ? this.highlightKeyword(label, labelPart) : label;
      return index === 0 ? node : [' / ', node];
    });
  }

  highlightKeyword(label, keyword) {
    return label.split(keyword).map((node, index) => index === 0 ? node : [
      (<span className="el-cascader-menu__item__keyword">{keyword}</span>),
      node
    ]);
  }

  flattenOptions(options, ancestor = []) {
    let flatOptions = [];

    options.forEach((option) => {
      const optionsStack = ancestor.concat(option);
      if (!option[this.childrenKey()]) {
        flatOptions.push(optionsStack);
      } else {
        if (this.changeOnSelect) {
          flatOptions.push(optionsStack);
        }
        flatOptions = flatOptions.concat(this.flattenOptions(option[this.childrenKey()], optionsStack));
      }
    });

    return flatOptions;
  }

  clearValue(e) {
    e.stopPropagation();

    this.handlePick([], true);
  }

  handleClickOutside() {
    if (this.state.menuVisible) {
      this.setState({ menuVisible: false });
    }
  }

  handleClick() {
    if (this.props.disabled) return;

    if (this.filterable) {
      this.setState({
        menuVisible: true
      });
      return;
    }

    this.setState({
      menuVisible: !this.state.menuVisible
    });
  }

  /* Computed Methods */

  labelKey() {
    return this.props.props.label || 'label';
  }

  valueKey() {
    return this.props.props.value || 'value';
  }

  childrenKey() {
    return this.props.props.children || 'children';
  }

  currentLabels() {
    let options = this.props.options;
    let labels = [];

    this.state.currentValue.forEach(value => {
      const targetOption = options && options.filter(option => option[this.valueKey()] === value)[0];

      if (targetOption) {
        labels.push(targetOption[this.labelKey()]);
        options = targetOption[this.childrenKey()];
      }
    });

    return labels;
  }

  render() {
    const { size, disabled, placeholder, filterable, clearable, showAllLevels } = this.props;
    const { menuVisible, inputHover, inputValue } = this.state;
    const currentLabels = this.currentLabels();

    return (
      <span ref="reference" className={this.className('el-cascader', size ? 'el-cascader--' + size : '', {
        'is-opened': menuVisible,
        'is-disabled': disabled
      })}>
        <span
          onClick={this.handleClick.bind(this)}
          onMouseEnter={() => { this.setState({ inputHover: true }) }}
          onMouseLeave={() => { this.setState({ inputHover: false }) }}
        >
          <Input
            ref="input"
            readOnly={!filterable}
            placeholder={currentLabels.length ? undefined : placeholder}
            value={inputValue}
            onChange={e => { this.setState({inputValue: e.target.value}) }}
            onKeyUp={this.debouncedInputChange.bind(this)}
            size={size}
            disabled={disabled}
            icon={
              clearable && inputHover && currentLabels.length ? (
                <i
                  className="el-input__icon el-icon-circle-close el-cascader__clearIcon"
                  onClick={this.clearValue.bind(this)}
                ></i>
              ) : (
                <i
                  className={this.classNames('el-input__icon el-icon-caret-bottom', {
                    'is-reverse': menuVisible
                  })}
                ></i>
              )
            }
          />
          <View show={inputValue === ''}>
            <span className="el-cascader__label">
              {
                showAllLevels ? currentLabels.map((label, index) => {
                  return (
                    <span key={index}>
                      {label}
                      {index < currentLabels.length - 1 && <span> / </span>}
                    </span>
                  )
                }) : currentLabels[currentLabels.length - 1]
              }
            </span>
          </View>
        </span>
        <CascaderMenu ref="menu" />
      </span>
    )
  }
}

Cascader.childContextTypes = {
  component: PropTypes.any
};

Cascader.propTypes = {
  options: PropTypes.array.isRequired,
  props: PropTypes.object,
  value: PropTypes.array,
  placeholder: PropTypes.string,
  disabled: PropTypes.bool,
  clearable: PropTypes.bool,
  changeOnSelect: PropTypes.bool,
  popperClass: PropTypes.string,
  expandTrigger: PropTypes.string,
  filterable: PropTypes.bool,
  size: PropTypes.string,
  showAllLevels: PropTypes.bool,
  debounce: PropTypes.number,
  activeItemChange: PropTypes.func,
  onChange: PropTypes.func
}

Cascader.defaultProps = {
  value: [],
  placeholder: i18n.t('el.cascader.placeholder'),
  clearable: false,
  expandTrigger: 'click',
  showAllLevels: true,
  debounce: 300,
  props: {
    children: 'children',
    label: 'label',
    value: 'value',
    disabled: 'disabled'
  }
}

export default ClickOutside(Cascader);
