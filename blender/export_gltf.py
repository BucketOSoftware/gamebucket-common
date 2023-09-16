import bpy
from bpy.ops import export_scene
from addon_utils import check, paths, enable
from pathlib import Path

# TODO: find a way to avoid hardcoding options

options = {
    'will_save_settings': False,
    'export_copyright': "Bucket o' Software",
    'export_format': 'GLB',

    'use_selection': False,
    'use_visible': False,
    'use_renderable': True,

    'export_apply': True,

    'export_frame_range': False,
    'export_nla_strips': True,
    'export_colors': False,

    'export_draco_mesh_compression_enable': False,

    # Animations look funny without it
    # Also this "bakes" IK
    'export_force_sampling': True,

    # Allegedly causes problems in some cases
    'export_optimize_animation_size': True,

    # Workaround for bug supposedly fixed in 3.4:
    # https://github.com/KhronosGroup/glTF-Blender-IO/issues/1677
    'export_current_frame': True,

    # Animations are at 60fps, but we resample with other tools after export 
    'export_frame_step': 1,
}

class WyrdExportOperator(bpy.types.Operator):
    bl_idname = "scene.wyrd_export"
    bl_label = "Wyrd Exporter"

    def execute(self, context):
        # self.report({"ERROR"}, "I feel uncomfortable")
        # return {"CANCELLED"}
    
        # TODO: this fails from the commandline
        # if bpy.data.is_dirty:
        #     self.report({"ERROR"}, "There are unsaved changes")
        #     return {"CANCELLED"}

        # TODO: this doesn't present the message to the user. What
        if not bpy.data.is_saved:
            self.report({"ERROR"}, "Current file is not saved")
            return {"CANCELLED"}


        # TODO: confirm that this isn't the path to the input file. Unlikely, but still
        export_path = Path(bpy.data.filepath).with_suffix('.glb')

        self.report({"INFO"}, "Exporting to %s" % (export_path))

        export_scene.gltf(
            filepath=str(export_path),
            **options
            )

        return {'FINISHED'}

def register():
    bpy.utils.register_class(WyrdExportOperator)

def unregister():
    bpy.utils.unregister_class(WyrdExportOperator)


if __name__ == "__main__":
    register()
    bpy.ops.scene.wyrd_export()
    unregister()
