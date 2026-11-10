import React from "react";
import PropTypes from "prop-types";

const SliderRow = ({
  label,
  propKey,
  value,
  min = 0,
  max = 100,
  step = 1,
  unit = "%",
  onChange,
}) => (
  <div className="flex items-center justify-between gap-6 py-2">
    <span className="text-sm text-[#D5D2C8]">{label}</span>
    <div className="flex items-center gap-3 w-52">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(propKey, parseFloat(e.target.value))}
        className="flex-1 accent-[#B99A70] cursor-pointer"
      />
      <span className="as-mono text-xs text-[#E8E9E2] w-12 text-right">
        {value}
        {unit}
      </span>
    </div>
  </div>
);

SliderRow.propTypes = {
  label: PropTypes.string.isRequired,
  propKey: PropTypes.string.isRequired,
  value: PropTypes.number.isRequired,
  min: PropTypes.number,
  max: PropTypes.number,
  step: PropTypes.number,
  unit: PropTypes.string,
  onChange: PropTypes.func.isRequired,
};

const ToggleRow = ({ label, propKey, checked, onChange }) => (
  <label className="flex items-center justify-between gap-6 py-2 cursor-pointer">
    <span className="text-sm text-[#D5D2C8]">{label}</span>
    <input
      type="checkbox"
      checked={Boolean(checked)}
      onChange={(e) => onChange(propKey, e.target.checked)}
      className="accent-[#B99A70] w-4 h-4 cursor-pointer"
    />
  </label>
);

ToggleRow.propTypes = {
  label: PropTypes.string.isRequired,
  propKey: PropTypes.string.isRequired,
  checked: PropTypes.bool,
  onChange: PropTypes.func.isRequired,
};

const SettingsScreen = ({ settings, onChangeSetting, onClose }) => (
  <div className="fixed inset-0 z-30 bg-[#151A19]/92 flex items-center justify-center p-6 md:p-12">
    <div className="w-full max-w-4xl h-[min(86vh,720px)] as-surface-solid flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-8 py-5 border-b border-[#E8E9E2]/12">
        <div>
          <div className="as-tech-label uppercase text-[#8F938C]">Observatory Configuration</div>
          <h2 className="as-section-heading text-[#F5F3ED] mt-0.5">Settings</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-1.5 rounded-[2px] border border-[#E8E9E2]/20 bg-[#202625] text-xs text-[#F5F3ED] cursor-pointer"
        >
          Done
        </button>
      </div>

      <div className="flex-1 overflow-y-auto as-scroll p-8 space-y-8">
        <section>
          <div className="as-tech-label uppercase text-[#B99A70] mb-3">Graphics &amp; Display</div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-[#D5D2C8]">Graphics preset</span>
            <div className="flex gap-2">
              {["Medium", "High"].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => onChangeSetting("graphicsPreset", p)}
                  className={`px-3 py-1 rounded-[2px] border text-xs cursor-pointer ${
                    settings.graphicsPreset === p
                      ? "bg-[#303735] border-[#B99A70]/65 text-[#F5F3ED]"
                      : "border-[#E8E9E2]/15 text-[#8F938C]"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <ToggleRow
            label="Ambient particulates"
            propKey="ambientEffects"
            checked={settings.ambientEffects}
            onChange={onChangeSetting}
          />
        </section>

        <section className="pt-6 border-t border-[#E8E9E2]/10">
          <div className="as-tech-label uppercase text-[#B99A70] mb-3">Audio</div>
          <SliderRow
            label="Master volume"
            propKey="masterVolume"
            value={settings.masterVolume}
            onChange={onChangeSetting}
          />
          <SliderRow
            label="Music volume"
            propKey="musicVolume"
            value={settings.musicVolume}
            onChange={onChangeSetting}
          />
          <SliderRow
            label="Ambient volume"
            propKey="ambientVolume"
            value={settings.ambientVolume}
            onChange={onChangeSetting}
          />
          <SliderRow
            label="Effects volume"
            propKey="effectsVolume"
            value={settings.effectsVolume}
            onChange={onChangeSetting}
          />
        </section>

        <section className="pt-6 border-t border-[#E8E9E2]/10">
          <div className="as-tech-label uppercase text-[#B99A70] mb-3">Gameplay</div>
          <SliderRow
            label="Mouse sensitivity"
            propKey="mouseSensitivity"
            value={settings.mouseSensitivity}
            min={0.4}
            max={2.0}
            step={0.1}
            unit="x"
            onChange={onChangeSetting}
          />
          <ToggleRow
            label="Invert Y-axis"
            propKey="invertY"
            checked={settings.invertY}
            onChange={onChangeSetting}
          />
        </section>

        <section className="pt-6 border-t border-[#E8E9E2]/10">
          <div className="as-tech-label uppercase text-[#B99A70] mb-3">Accessibility</div>
          <ToggleRow
            label="Reduced motion"
            propKey="reducedMotion"
            checked={settings.reducedMotion}
            onChange={onChangeSetting}
          />
          <ToggleRow
            label="High contrast surfaces"
            propKey="highContrast"
            checked={settings.highContrast}
            onChange={onChangeSetting}
          />
          <ToggleRow
            label="Large text scale"
            propKey="largeText"
            checked={settings.largeText}
            onChange={onChangeSetting}
          />
        </section>
      </div>
    </div>
  </div>
);

SettingsScreen.propTypes = {
  settings: PropTypes.object.isRequired,
  onChangeSetting: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default SettingsScreen;
