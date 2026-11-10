import React from "react";
import PropTypes from "prop-types";

const CompletionScreen = ({
  discoveriesCount,
  regionsCount,
  artifactsCount,
  onContinueExploring,
  onReturnMenu,
}) => (
  <div className="fixed inset-0 z-30 bg-[#151A19]/75 flex items-center justify-center p-8 md:p-16">
    <div className="w-full max-w-2xl as-surface-atmospheric p-10 md:p-14 text-center">
      <div className="as-tech-label uppercase text-[#B99A70]">EXPEDITION COMPLETE</div>
      <h2 className="as-chapter-title text-[#F5F3ED] mt-2">THE SILENT SINGULARITY</h2>

      <p className="as-body text-[#D5D2C8] mt-5">
        The structure is stable.
      </p>
      <p className="as-secondary text-[#8F938C] mt-1">
        The expedition record has been updated.
      </p>

      <div className="grid grid-cols-3 gap-4 my-9 py-6 border-y border-[#E8E9E2]/12">
        <div>
          <div className="as-serif text-3xl text-[#EDEAE1]">{discoveriesCount}</div>
          <div className="as-tech-label uppercase text-[#8F938C] mt-1">Discoveries</div>
        </div>
        <div>
          <div className="as-serif text-3xl text-[#EDEAE1]">{regionsCount}</div>
          <div className="as-tech-label uppercase text-[#8F938C] mt-1">Regions explored</div>
        </div>
        <div>
          <div className="as-serif text-3xl text-[#EDEAE1]">{artifactsCount}</div>
          <div className="as-tech-label uppercase text-[#8F938C] mt-1">Artifacts recovered</div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          type="button"
          onClick={onContinueExploring}
          className="w-full sm:w-auto px-6 py-3 rounded-[2px] bg-[#202625] hover:bg-[#303735] border border-[#E8E9E2]/25 text-xs tracking-[0.16em] uppercase text-[#F5F3ED] cursor-pointer"
        >
          CONTINUE EXPLORING
        </button>
        <button
          type="button"
          onClick={onReturnMenu}
          className="w-full sm:w-auto px-6 py-3 rounded-[2px] border border-[#E8E9E2]/15 hover:border-[#E8E9E2]/30 text-xs tracking-[0.16em] uppercase text-[#BEBDB2] hover:text-[#F5F3ED] cursor-pointer"
        >
          RETURN TO EXPEDITIONS
        </button>
      </div>
    </div>
  </div>
);

CompletionScreen.propTypes = {
  discoveriesCount: PropTypes.number.isRequired,
  regionsCount: PropTypes.number.isRequired,
  artifactsCount: PropTypes.number.isRequired,
  onContinueExploring: PropTypes.func.isRequired,
  onReturnMenu: PropTypes.func.isRequired,
};

export default CompletionScreen;
